-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0026 · Fase 4 · Rebanada B · Venta de productos en el POS                 ║
-- ║                                                                            ║
-- ║ UN SOLO TICKET puede llevar membresía y productos. `sale_items` se diseñó  ║
-- ║ genérica desde 0013 justo para esto; aquí gana `product_id`.               ║
-- ║                                                                            ║
-- ║ CANCELACIÓN POR LÍNEA. Se puede quitar un artículo de una compra sin tirar ║
-- ║ el ticket entero. Pero la línea se MARCA cancelada, no se borra, y los     ║
-- ║ montos guardados de la venta no se tocan: si al cancelar una línea se      ║
-- ║ reescribiera el total de una venta de ayer, un turno de caja ya cerrado y  ║
-- ║ arqueado dejaría de cuadrar y el corte de ese día cambiaría solo. El       ║
-- ║ ticket conserva su folio y muestra original, cancelado y neto; el dinero   ║
-- ║ devuelto sale como egreso del turno de quien cancela, igual que hoy.       ║
-- ║                                                                            ║
-- ║ EL DESCUENTO SE PRORRATEA. Es de la venta, no de la línea, así que al      ║
-- ║ cancelar una se devuelve su parte proporcional: cobrar 100 con 10% de      ║
-- ║ descuento y devolver 100 sería regalar el descuento.                       ║
-- ║                                                                            ║
-- ║ VENTA SIN SOCIO. Un ticket de sólo productos no exige cliente: obligar a   ║
-- ║ elegir uno para vender un agua lleva a que todo se cargue al socio #0001 y ║
-- ║ ensucia el historial. Con membresía sí es obligatorio, por definición.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Ampliación del esquema existente.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sales
  alter column client_id drop not null;

comment on column public.sales.client_id is
  'Socio de la venta. NULL sólo en tickets de productos a público general.';

alter table public.sale_items
  add column product_id     uuid references public.products (id) on delete set null,
  add column cancelled_at   timestamptz,
  add column cancelled_by   uuid references auth.users (id) on delete set null,
  add column cancel_reason  text,
  -- Lo efectivamente devuelto por esta línea (con su parte del descuento e IVA).
  add column refunded_amount numeric(10, 2);

comment on column public.sale_items.cancelled_at is
  'Instante en que se canceló esta línea. La línea no se borra: el ticket '
  'conserva lo que se cobró y muestra aparte lo devuelto.';

create index sale_items_product_idx on public.sale_items (product_id);

-- Una línea es de membresía o de producto, nunca de las dos ni de ninguna.
alter table public.sale_items
  add constraint sale_items_one_kind check (
    (membership_plan_id is not null and product_id is null) or
    (membership_plan_id is null and product_id is not null) or
    (membership_plan_id is null and product_id is null)  -- líneas históricas
  ) not valid;

-- ─────────────────────────────────────────────────────────────────────────────
-- create_sale: reemplaza a create_membership_sale. Membresía opcional +
-- productos opcionales, con al menos una cosa que cobrar.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.create_membership_sale(uuid, uuid, uuid, text, text, numeric, text);

create or replace function public.create_sale(
  p_client         uuid,
  p_partner        uuid,
  p_plan           uuid,
  p_items          jsonb,   -- [{"product_id": "…", "quantity": 2}, …]
  p_payment_method text,
  p_discount_type  text,
  p_discount_value numeric,
  p_notes          text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_org       uuid;
  v_session   uuid;
  v_sessorg   uuid;
  v_branch    uuid;
  v_price     numeric(10, 2);
  v_duration  integer;
  v_maxmem    integer;
  v_planname  text;
  v_active    boolean;
  v_qty       integer;
  v_subtotal  numeric(10, 2) := 0;
  v_discount  numeric(10, 2);
  v_base      numeric(10, 2);
  v_tax       numeric(10, 2);
  v_total     numeric(10, 2);
  v_iva       constant numeric := 0.16;
  v_folio     bigint;
  v_start     date;
  v_end       date;
  v_sale      uuid;
  v_item      jsonb;
  v_prod      public.products%rowtype;
  v_line_qty  integer;
  v_line_tot  numeric(10, 2);
begin
  if p_payment_method not in ('cash', 'card', 'transfer') then
    raise exception 'Método de pago inválido' using errcode = '22023';
  end if;

  -- Turno de caja: obligatorio para cualquier método de pago.
  v_session := public.current_cash_session();
  if v_session is null then
    raise exception 'Abre tu turno de caja para registrar ventas' using errcode = 'P0001';
  end if;
  select cs.org_id, cs.branch_id into v_sessorg, v_branch
  from public.cash_sessions cs where cs.id = v_session;
  v_org := v_sessorg;

  if p_plan is null and (p_items is null or jsonb_array_length(p_items) = 0) then
    raise exception 'Agrega una membresía o algún producto al ticket' using errcode = 'P0001';
  end if;

  -- ── Membresía (opcional) ──────────────────────────────────────────────────
  if p_plan is not null then
    if p_client is null then
      raise exception 'Una membresía necesita un socio' using errcode = 'P0001';
    end if;

    select mp.org_id, mp.price, mp.duration_days, mp.max_members, mp.name, mp.is_active
      into v_sessorg, v_price, v_duration, v_maxmem, v_planname, v_active
    from public.membership_plans mp
    where mp.id = p_plan;

    if not found then
      raise exception 'Membresía no encontrada' using errcode = 'P0002';
    end if;
    if not v_active then
      raise exception 'La membresía no está disponible para venta' using errcode = 'P0001';
    end if;
    if v_maxmem not in (1, 2) then
      raise exception 'El POS sólo soporta planes de 1 o 2 personas' using errcode = 'P0001';
    end if;
    if v_sessorg <> v_org then
      raise exception 'La membresía no pertenece a la organización de tu turno' using errcode = '42501';
    end if;

    if v_maxmem = 2 then
      if p_partner is null then
        raise exception 'Esta membresía es de pareja: falta el segundo cliente' using errcode = 'P0001';
      end if;
      if p_partner = p_client then
        raise exception 'El segundo cliente debe ser distinto al primero' using errcode = 'P0001';
      end if;
    else
      p_partner := null;
    end if;

    v_qty      := v_maxmem;
    v_subtotal := v_subtotal + round(v_price * v_qty, 2);
  else
    p_partner := null;
  end if;

  -- ── Productos (opcionales): primero se suman, luego se cobra ──────────────
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_line_qty := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_line_qty <= 0 then
      raise exception 'La cantidad de cada producto debe ser mayor a cero' using errcode = '22023';
    end if;

    select * into v_prod from public.products p
    where p.id = (v_item ->> 'product_id')::uuid;

    if not found then
      raise exception 'Producto no encontrado' using errcode = 'P0002';
    end if;
    if v_prod.org_id <> v_org then
      raise exception 'El producto no pertenece a la organización de tu turno' using errcode = '42501';
    end if;
    if not v_prod.is_active then
      raise exception 'El producto "%" no está disponible para venta', v_prod.name using errcode = 'P0001';
    end if;

    v_subtotal := v_subtotal + round(v_prod.price * v_line_qty, 2);
  end loop;

  -- ── Montos (base sin IVA → descuento → IVA → total) ───────────────────────
  if p_discount_type = 'percent' then
    v_discount := round(v_subtotal * least(greatest(coalesce(p_discount_value, 0), 0), 100) / 100, 2);
  elsif p_discount_type = 'amount' then
    v_discount := least(greatest(coalesce(p_discount_value, 0), 0), v_subtotal);
  else
    p_discount_type := 'none';
    v_discount := 0;
  end if;

  v_base  := v_subtotal - v_discount;
  v_tax   := round(v_base * v_iva, 2);
  v_total := v_base + v_tax;

  v_folio := public.next_counter(v_org, 'sale');

  insert into public.sales (
    org_id, branch_id, folio, client_id, partner_client_id, cashier_id, cash_session_id,
    subtotal, discount_type, discount_value, discount_amount, tax_amount, total,
    payment_method, notes
  ) values (
    v_org, v_branch, v_folio, p_client, p_partner, (select auth.uid()), v_session,
    v_subtotal, p_discount_type, coalesce(p_discount_value, 0), v_discount, v_tax, v_total,
    p_payment_method, p_notes
  )
  returning id into v_sale;

  -- ── Línea de membresía y vigencia otorgada ────────────────────────────────
  if p_plan is not null then
    insert into public.sale_items (
      sale_id, org_id, membership_plan_id, description, unit_price, quantity, line_total
    ) values (
      v_sale, v_org, p_plan, v_planname, v_price, v_qty, round(v_price * v_qty, 2)
    );

    v_start := public.next_membership_start(p_client, current_date);
    v_end   := v_start + (v_duration - 1);

    insert into public.client_memberships (
      org_id, client_id, membership_plan_id, plan_name, sale_id, start_date, end_date
    ) values (v_org, p_client, p_plan, v_planname, v_sale, v_start, v_end);

    if p_partner is not null then
      insert into public.client_memberships (
        org_id, client_id, membership_plan_id, plan_name, sale_id, start_date, end_date
      ) values (v_org, p_partner, p_plan, v_planname, v_sale, v_start, v_end);
    end if;
  end if;

  -- ── Líneas de producto y salida de inventario ─────────────────────────────
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_line_qty := (v_item ->> 'quantity')::integer;
    select * into v_prod from public.products p
    where p.id = (v_item ->> 'product_id')::uuid;

    v_line_tot := round(v_prod.price * v_line_qty, 2);

    insert into public.sale_items (
      sale_id, org_id, product_id, description, unit_price, quantity, line_total
    ) values (
      v_sale, v_org, v_prod.id, v_prod.name, v_prod.price, v_line_qty, v_line_tot
    );

    -- Descuenta del anaquel del turno. Si no alcanza, revienta aquí y la venta
    -- entera se deshace: no se cobra lo que no se puede entregar.
    if v_prod.track_stock then
      if v_branch is null then
        raise exception 'Tu turno no tiene sucursal: no se puede descontar inventario'
          using errcode = 'P0001';
      end if;
      perform public.register_stock_movement(
        v_prod.id, v_branch, 'sale', v_line_qty, null, null, v_sale);
    end if;
  end loop;

  return v_sale;
end;
$$;

comment on function public.create_sale(uuid, uuid, uuid, jsonb, text, text, numeric, text) is
  'Registra una venta con membresía y/o productos, descontando inventario.';

revoke execute on function public.create_sale(uuid, uuid, uuid, jsonb, text, text, numeric, text) from public, anon;
grant  execute on function public.create_sale(uuid, uuid, uuid, jsonb, text, text, numeric, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_sale_item: quita UNA línea del ticket.
--   Devuelve su parte proporcional del descuento, regresa el producto al
--   anaquel y —si era la membresía— revierte la vigencia otorgada.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cancel_sale_item(p_item uuid, p_reason text)
returns numeric
language plpgsql
set search_path = ''
as $$
declare
  v_item    public.sale_items%rowtype;
  v_sale    public.sales%rowtype;
  v_session uuid;
  v_sessorg uuid;
  v_share   numeric;
  v_refund  numeric(10, 2);
  v_left    integer;
begin
  select * into v_item from public.sale_items si where si.id = p_item;
  if not found then
    raise exception 'Línea no encontrada' using errcode = 'P0002';
  end if;
  if v_item.cancelled_at is not null then
    raise exception 'Esa línea ya está cancelada' using errcode = 'P0001';
  end if;

  select * into v_sale from public.sales s where s.id = v_item.sale_id;
  if v_sale.status = 'cancelled' then
    raise exception 'La venta ya está cancelada' using errcode = 'P0001';
  end if;

  -- Fuera del mismo día, sólo un administrador (misma regla que siempre).
  if v_sale.sold_at::date <> current_date and not public.is_org_admin(v_sale.org_id) then
    raise exception 'Sólo un administrador puede cancelar ventas de días anteriores'
      using errcode = '42501';
  end if;

  -- El dinero que sale necesita un turno donde registrarse.
  v_session := public.current_cash_session();
  if v_session is null then
    raise exception 'Abre tu turno de caja para registrar el reembolso' using errcode = 'P0001';
  end if;
  select cs.org_id into v_sessorg from public.cash_sessions cs where cs.id = v_session;
  if v_sessorg <> v_sale.org_id then
    raise exception 'La venta no pertenece a la organización de tu turno' using errcode = '42501';
  end if;

  -- Parte proporcional: el descuento es del ticket, no de la línea. Devolver el
  -- importe completo de la línea sería regalar el descuento que se aplicó.
  v_share  := case when v_sale.subtotal = 0 then 0
                   else v_item.line_total / v_sale.subtotal end;
  v_refund := round((v_sale.subtotal - v_sale.discount_amount) * v_share * 1.16, 2);

  update public.sale_items
     set cancelled_at    = now(),
         cancelled_by    = (select auth.uid()),
         cancel_reason   = p_reason,
         refunded_amount = v_refund
   where id = p_item;

  -- Membresía: se revierte la vigencia que otorgó.
  if v_item.membership_plan_id is not null then
    update public.client_memberships
       set status = 'cancelled'
     where sale_id = v_sale.id
       and status <> 'cancelled';
  end if;

  -- Producto: regresa al anaquel donde se vendió.
  if v_item.product_id is not null and v_sale.branch_id is not null then
    if exists (select 1 from public.products p
                where p.id = v_item.product_id and p.track_stock) then
      perform public.register_stock_movement(
        v_item.product_id, v_sale.branch_id, 'sale_return', v_item.quantity,
        null, 'Cancelación de línea del ticket', v_sale.id);
    end if;
  end if;

  -- Egreso del reembolso, con el método de pago original: un reembolso a
  -- tarjeta se registra pero no mueve el cajón.
  insert into public.cash_movements (
    org_id, cash_session_id, kind, category, payment_method, amount, description,
    sale_id, created_by
  ) values (
    v_sale.org_id, v_session, 'expense', 'sale_refund', v_sale.payment_method, v_refund,
    'Cancelación de «' || v_item.description || '» en la venta V-' ||
      lpad(v_sale.folio::text, 4, '0'),
    v_sale.id, (select auth.uid())
  );

  -- Si ya no queda nada vigente, el ticket entero queda cancelado.
  select count(*) into v_left
  from public.sale_items si
  where si.sale_id = v_sale.id and si.cancelled_at is null;

  update public.sales
     set refund_amount = coalesce(refund_amount, 0) + v_refund,
         status        = case when v_left = 0 then 'cancelled' else status end,
         cancelled_at  = case when v_left = 0 then now() else cancelled_at end,
         cancelled_by  = case when v_left = 0 then (select auth.uid()) else cancelled_by end,
         cancel_reason = case when v_left = 0 then p_reason else cancel_reason end
   where id = v_sale.id;

  return v_refund;
end;
$$;

comment on function public.cancel_sale_item(uuid, text) is
  'Cancela una línea del ticket: devuelve su parte proporcional, regresa el '
  'producto al inventario y revierte la membresía si era esa la línea.';

-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_sale (v3): cancelar el ticket completo = cancelar todas sus líneas.
--   Se reescribe sobre cancel_sale_item para que exista UN solo camino que
--   toque dinero e inventario; dos rutas paralelas es como aparecen los
--   descuadres.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cancel_sale(p_sale uuid, p_reason text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_item uuid;
  v_any  boolean := false;
begin
  for v_item in
    select si.id from public.sale_items si
    where si.sale_id = p_sale and si.cancelled_at is null
    order by si.created_at
  loop
    perform public.cancel_sale_item(v_item, p_reason);
    v_any := true;
  end loop;

  if not v_any then
    raise exception 'La venta ya está cancelada' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.cancel_sale_item(uuid, text) from public, anon;
grant  execute on function public.cancel_sale_item(uuid, text) to authenticated;

-- El POS necesita poder marcar la línea como cancelada.
create policy "sale_items: staff can update"
  on public.sale_items for update to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]))
  with check (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]));
