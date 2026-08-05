-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0013 · Fase 1 · POS: ventas de membresías + membresías otorgadas           ║
-- ║                                                                            ║
-- ║ · sales           → una venta (folio, cliente(s), cajero, montos, pago).   ║
-- ║ · sale_items      → líneas (snapshot de precio; reutilizable para product).║
-- ║ · client_memberships → membresía otorgada (vigencia, días restantes).      ║
-- ║                                                                            ║
-- ║ Reglas de negocio (especificación §7, resueltas 2026-07-16):               ║
-- ║ · Precios BASE SIN IVA; el 16% se calcula y suma aparte.                    ║
-- ║ · Renovación anticipada APILA sobre el vencimiento vigente.                 ║
-- ║ · Un solo método de pago por venta (efectivo/tarjeta/transferencia).       ║
-- ║ · Parejas = venta vinculada (2 clientes, vencimiento compartido).          ║
-- ║ · Reembolso total el mismo día/turno; después sólo admin.                  ║
-- ║                                                                            ║
-- ║ La venta se crea ATÓMICAMENTE en create_membership_sale() (SECURITY        ║
-- ║ INVOKER → respeta RLS y roles). Los montos se calculan en el servidor.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- sales
-- ─────────────────────────────────────────────────────────────────────────────
create table public.sales (
  id                uuid primary key default extensions.gen_random_uuid(),
  org_id            uuid  not null references public.organizations (id) on delete cascade,
  branch_id         uuid  references public.branches (id) on delete set null,
  folio             bigint not null,                 -- consecutivo por org (V-0001)
  client_id         uuid  not null references public.clients (id) on delete restrict,
  partner_client_id uuid  references public.clients (id) on delete restrict, -- Parejas
  cashier_id        uuid  references auth.users (id) on delete set null,
  -- Turno de caja: opcional en este slice; se vuelve obligatorio en el de Caja.
  cash_session_id   uuid,

  -- Montos. subtotal = base SIN IVA antes de descuento.
  subtotal          numeric(10, 2) not null check (subtotal >= 0),
  discount_type     text not null default 'none' check (discount_type in ('none', 'amount', 'percent')),
  discount_value    numeric(10, 2) not null default 0 check (discount_value >= 0), -- crudo capturado
  discount_amount   numeric(10, 2) not null default 0 check (discount_amount >= 0), -- pesos
  tax_amount        numeric(10, 2) not null default 0 check (tax_amount >= 0),      -- IVA
  total             numeric(10, 2) not null check (total >= 0),

  payment_method    text not null check (payment_method in ('cash', 'card', 'transfer')),
  status            text not null default 'completed' check (status in ('completed', 'cancelled')),

  -- Cancelación / reembolso.
  cancelled_at      timestamptz,
  cancelled_by      uuid references auth.users (id) on delete set null,
  cancel_reason     text,
  refund_amount     numeric(10, 2),

  notes             text,
  sold_at           timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (org_id, folio)
);

comment on table public.sales is
  'Ventas del POS. Montos sin IVA + IVA + total. Inmutable salvo cancelación.';

create index sales_org_soldat_idx  on public.sales (org_id, sold_at desc);
create index sales_org_status_idx  on public.sales (org_id, status);
create index sales_client_idx      on public.sales (client_id);
create index sales_branch_idx      on public.sales (branch_id);

create trigger trg_sales_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

create trigger trg_audit_sales
  after insert or update or delete on public.sales
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- sale_items (líneas). Guardan snapshot del nombre y precio al momento de vender.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.sale_items (
  id                 uuid primary key default extensions.gen_random_uuid(),
  sale_id            uuid  not null references public.sales (id) on delete cascade,
  org_id             uuid  not null references public.organizations (id) on delete cascade,
  membership_plan_id uuid  references public.membership_plans (id) on delete set null,
  description        text  not null,                 -- snapshot del nombre del plan
  unit_price         numeric(10, 2) not null check (unit_price >= 0), -- sin IVA
  quantity           integer not null default 1 check (quantity >= 1),
  line_total         numeric(10, 2) not null check (line_total >= 0), -- unit_price*quantity
  created_at         timestamptz not null default now()
);

comment on table public.sale_items is
  'Líneas de una venta con snapshot de precio (inmune a cambios de catálogo).';

create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_org_idx  on public.sale_items (org_id);

create trigger trg_audit_sale_items
  after insert or update or delete on public.sale_items
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- client_memberships (membresía otorgada). Fuente de "días restantes"/vencimiento.
--   El estado 'vencido' se DERIVA de end_date en la app; aquí sólo distinguimos
--   'active' vs 'cancelled'. (Un job podrá pasar a 'expired' en el futuro.)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.client_memberships (
  id                 uuid primary key default extensions.gen_random_uuid(),
  org_id             uuid  not null references public.organizations (id) on delete cascade,
  client_id          uuid  not null references public.clients (id) on delete cascade,
  membership_plan_id uuid  references public.membership_plans (id) on delete set null,
  plan_name          text  not null,                 -- snapshot
  sale_id            uuid  references public.sales (id) on delete set null,
  start_date         date  not null,
  end_date           date  not null,
  status             text  not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (end_date >= start_date)
);

comment on table public.client_memberships is
  'Membresía otorgada a un cliente. Alimenta días restantes y estado en la ficha.';

create index client_memberships_client_idx on public.client_memberships (client_id, end_date desc);
create index client_memberships_org_status_idx on public.client_memberships (org_id, status);
create index client_memberships_sale_idx on public.client_memberships (sale_id);

create trigger trg_client_memberships_updated_at
  before update on public.client_memberships
  for each row execute function public.set_updated_at();

create trigger trg_audit_client_memberships
  after insert or update or delete on public.client_memberships
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- Fecha de inicio de la próxima membresía de un cliente (regla de APILADO):
--   si tiene una membresía no cancelada que aún no vence, la nueva empieza el
--   día siguiente a ese vencimiento; si no, empieza en p_from (hoy).
--   SECURITY INVOKER → respeta RLS (sólo ve las membresías de la propia org).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.next_membership_start(p_client uuid, p_from date)
returns date
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select max(cm.end_date) + 1
     from public.client_memberships cm
     where cm.client_id = p_client
       and cm.status <> 'cancelled'
       and cm.end_date >= p_from),
    p_from
  );
$$;

revoke execute on function public.next_membership_start(uuid, date) from public, anon;
grant  execute on function public.next_membership_start(uuid, date) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- create_membership_sale: crea venta + línea + membresía(s) atómicamente.
--   SECURITY INVOKER → cada INSERT pasa por RLS con la identidad del cajero
--   (así se exige el rol admin/gerente/recepcionista de esa org).
--   Devuelve el id de la venta creada.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.create_membership_sale(
  p_client         uuid,
  p_partner        uuid,
  p_plan           uuid,
  p_branch         uuid,
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
  v_price     numeric(10, 2);
  v_duration  integer;
  v_maxmem    integer;
  v_planname  text;
  v_active    boolean;
  v_qty       integer;
  v_subtotal  numeric(10, 2);
  v_discount  numeric(10, 2);
  v_base      numeric(10, 2);
  v_tax       numeric(10, 2);
  v_total     numeric(10, 2);
  v_iva       constant numeric := 0.16;
  v_folio     bigint;
  v_start     date;
  v_end       date;
  v_sale      uuid;
begin
  if p_payment_method not in ('cash', 'card', 'transfer') then
    raise exception 'Método de pago inválido' using errcode = '22023';
  end if;

  -- Plan (bajo RLS: sólo se lee si es de la org del cajero).
  select mp.org_id, mp.price, mp.duration_days, mp.max_members, mp.name, mp.is_active
    into v_org, v_price, v_duration, v_maxmem, v_planname, v_active
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

  -- Validación de Parejas (2 personas) vs individual.
  if v_maxmem = 2 then
    if p_partner is null then
      raise exception 'Esta membresía es de pareja: falta el segundo cliente' using errcode = 'P0001';
    end if;
    if p_partner = p_client then
      raise exception 'El segundo cliente debe ser distinto al primero' using errcode = 'P0001';
    end if;
  else
    p_partner := null; -- individual: ignoramos cualquier acompañante
  end if;

  -- Sucursal: si se indica, el cajero debe poder operarla.
  if p_branch is not null and not public.can_access_branch(p_branch) then
    raise exception 'No puedes operar esa sucursal' using errcode = '42501';
  end if;

  -- Montos (base sin IVA → descuento → IVA → total).
  v_qty      := v_maxmem;
  v_subtotal := round(v_price * v_qty, 2);

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

  -- Folio consecutivo por organización.
  v_folio := public.next_counter(v_org, 'sale');

  -- Vigencia (apila sobre el vencimiento vigente del cliente principal).
  v_start := public.next_membership_start(p_client, current_date);
  v_end   := v_start + (v_duration - 1);

  -- Venta (RLS exige rol de staff en la org).
  insert into public.sales (
    org_id, branch_id, folio, client_id, partner_client_id, cashier_id,
    subtotal, discount_type, discount_value, discount_amount, tax_amount, total,
    payment_method, notes
  ) values (
    v_org, p_branch, v_folio, p_client, p_partner, (select auth.uid()),
    v_subtotal, p_discount_type, coalesce(p_discount_value, 0), v_discount, v_tax, v_total,
    p_payment_method, p_notes
  )
  returning id into v_sale;

  -- Línea (snapshot de nombre y precio).
  insert into public.sale_items (
    sale_id, org_id, membership_plan_id, description, unit_price, quantity, line_total
  ) values (
    v_sale, v_org, p_plan, v_planname, v_price, v_qty, v_subtotal
  );

  -- Membresía(s) otorgada(s): cliente principal y, si aplica, la pareja.
  insert into public.client_memberships (
    org_id, client_id, membership_plan_id, plan_name, sale_id, start_date, end_date
  ) values (
    v_org, p_client, p_plan, v_planname, v_sale, v_start, v_end
  );

  if p_partner is not null then
    insert into public.client_memberships (
      org_id, client_id, membership_plan_id, plan_name, sale_id, start_date, end_date
    ) values (
      v_org, p_partner, p_plan, v_planname, v_sale, v_start, v_end
    );
  end if;

  return v_sale;
end;
$$;

revoke execute on function public.create_membership_sale(uuid, uuid, uuid, uuid, text, text, numeric, text) from public, anon;
grant  execute on function public.create_membership_sale(uuid, uuid, uuid, uuid, text, text, numeric, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_sale: cancela una venta y revierte sus membresías.
--   Regla: reembolso total el MISMO día para staff; en otra fecha, sólo admin.
--   Registra refund_amount = total (el egreso en caja llega en el slice de Caja).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cancel_sale(p_sale uuid, p_reason text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_org    uuid;
  v_status text;
  v_total  numeric(10, 2);
  v_date   date;
begin
  select s.org_id, s.status, s.total, s.sold_at::date
    into v_org, v_status, v_total, v_date
  from public.sales s
  where s.id = p_sale;

  if not found then
    raise exception 'Venta no encontrada' using errcode = 'P0002';
  end if;
  if v_status = 'cancelled' then
    raise exception 'La venta ya está cancelada' using errcode = 'P0001';
  end if;

  -- Fuera del mismo día, sólo un administrador puede cancelar/reembolsar.
  if v_date <> current_date and not public.is_org_admin(v_org) then
    raise exception 'Sólo un administrador puede cancelar ventas de días anteriores'
      using errcode = '42501';
  end if;

  update public.sales
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = (select auth.uid()),
         cancel_reason = p_reason,
         refund_amount = v_total
   where id = p_sale;

  update public.client_memberships
     set status = 'cancelled'
   where sale_id = p_sale
     and status <> 'cancelled';
end;
$$;

revoke execute on function public.cancel_sale(uuid, text) from public, anon;
grant  execute on function public.cancel_sale(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS · sales / sale_items / client_memberships
--   Ver: miembros de la org. Escribir: staff (admin/gerente/recepcionista).
--   Las ventas NO se borran (inmutables); cancelar es un UPDATE controlado.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sales              enable row level security;
alter table public.sale_items         enable row level security;
alter table public.client_memberships enable row level security;

-- staff = admin, manager, receptionist
create policy "sales: members can read"
  on public.sales for select to authenticated
  using (public.is_org_member(org_id));

create policy "sales: staff can insert"
  on public.sales for insert to authenticated
  with check (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]));

create policy "sales: staff can update"
  on public.sales for update to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]))
  with check (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]));

create policy "sale_items: members can read"
  on public.sale_items for select to authenticated
  using (public.is_org_member(org_id));

create policy "sale_items: staff can insert"
  on public.sale_items for insert to authenticated
  with check (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]));

create policy "client_memberships: members can read"
  on public.client_memberships for select to authenticated
  using (public.is_org_member(org_id));

create policy "client_memberships: staff can insert"
  on public.client_memberships for insert to authenticated
  with check (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]));

create policy "client_memberships: staff can update"
  on public.client_memberships for update to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]))
  with check (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]));
