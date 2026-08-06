-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0014 · Fase 1 · Caja: turnos (apertura/cierre), movimientos y arqueo       ║
-- ║                                                                            ║
-- ║ · cash_sessions   → turno de un cajero: fondo inicial, cierre y arqueo.    ║
-- ║ · cash_movements  → ingresos/egresos manuales y reembolsos del turno.      ║
-- ║ · cash_session_totals → vista con el desglose y el efectivo esperado.      ║
-- ║                                                                            ║
-- ║ Decisiones (especificación §4 · Caja):                                     ║
-- ║ · El turno es POR CAJERO: cada usuario abre y cierra el suyo. Un solo      ║
-- ║   turno abierto por persona y organización (índice único parcial).         ║
-- ║ · El turno se vuelve OBLIGATORIO para vender (el slice de POS lo dejó      ║
-- ║   opcional): toda venta —efectivo, tarjeta o transferencia— cuelga de un   ║
-- ║   turno, para que el corte del turno esté completo.                        ║
-- ║ · La sucursal de la venta la determina el turno, no el formulario.         ║
-- ║ · El ARQUEO sólo cuenta efectivo: las ventas con tarjeta/transferencia y   ║
-- ║   sus reembolsos no tocan el cajón, pero sí aparecen en el corte.          ║
-- ║ · difference = contado − esperado (negativo = faltante, positivo = sobra). ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- cash_sessions (turno de caja)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.cash_sessions (
  id             uuid primary key default extensions.gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  branch_id      uuid references public.branches (id) on delete set null,

  -- Apertura.
  opened_by      uuid not null references auth.users (id) on delete restrict,
  opened_at      timestamptz not null default now(),
  opening_float  numeric(10, 2) not null default 0 check (opening_float >= 0),
  open_notes     text,

  -- Cierre + arqueo (nulos mientras el turno está abierto).
  closed_by      uuid references auth.users (id) on delete set null,
  closed_at      timestamptz,
  counted_cash   numeric(10, 2) check (counted_cash >= 0),  -- efectivo contado
  expected_cash  numeric(10, 2),                            -- calculado al cerrar
  difference     numeric(10, 2),                            -- contado − esperado
  close_notes    text,

  status         text not null default 'open' check (status in ('open', 'closed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Un turno cerrado guarda SIEMPRE su arqueo completo; uno abierto, ninguno.
  constraint cash_sessions_close_fields check (
    (status = 'open'
       and closed_at is null and closed_by is null and counted_cash is null
       and expected_cash is null and difference is null)
    or
    (status = 'closed'
       and closed_at is not null and counted_cash is not null
       and expected_cash is not null and difference is not null)
  )
);

comment on table public.cash_sessions is
  'Turno de caja de un cajero: fondo inicial, cierre y arqueo (diferencias).';
comment on column public.cash_sessions.difference is
  'Contado − esperado. Negativo = faltante en caja; positivo = sobrante.';

-- Un cajero no puede tener dos turnos abiertos a la vez en la misma org.
create unique index cash_sessions_one_open_per_user_idx
  on public.cash_sessions (org_id, opened_by)
  where status = 'open';

create index cash_sessions_org_opened_idx on public.cash_sessions (org_id, opened_at desc);
create index cash_sessions_branch_idx     on public.cash_sessions (branch_id);

create trigger trg_cash_sessions_updated_at
  before update on public.cash_sessions
  for each row execute function public.set_updated_at();

create trigger trg_audit_cash_sessions
  after insert or update or delete on public.cash_sessions
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- cash_movements (ingresos/egresos del turno que NO son ventas)
--   Incluye el reembolso automático que genera cancel_sale.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.cash_movements (
  id              uuid primary key default extensions.gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  cash_session_id uuid not null references public.cash_sessions (id) on delete cascade,

  kind            text not null check (kind in ('income', 'expense')),
  category        text not null default 'other' check (category in (
                    'sale_refund',  -- reembolso por cancelación de venta
                    'supplier',     -- pago a proveedor
                    'payroll',      -- pago a personal
                    'withdrawal',   -- retiro de efectivo a bóveda/banco
                    'deposit',      -- aportación de efectivo al cajón
                    'adjustment',   -- ajuste manual
                    'other')),
  -- Sólo los movimientos en efectivo entran al arqueo del cajón.
  payment_method  text not null default 'cash' check (payment_method in ('cash', 'card', 'transfer')),
  amount          numeric(10, 2) not null check (amount > 0),
  description     text,
  sale_id         uuid references public.sales (id) on delete set null,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table public.cash_movements is
  'Ingresos/egresos de un turno distintos de las ventas (reembolsos, retiros, gastos).';

create index cash_movements_session_idx on public.cash_movements (cash_session_id, created_at desc);
create index cash_movements_org_idx     on public.cash_movements (org_id, created_at desc);
create index cash_movements_sale_idx    on public.cash_movements (sale_id);

create trigger trg_audit_cash_movements
  after insert or update or delete on public.cash_movements
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- sales.cash_session_id: el slice de POS lo dejó suelto; aquí se ata y se
-- vuelve obligatorio. El CHECK va NOT VALID para no romper filas de desarrollo
-- creadas antes de esta migración: rige para todo lo que se inserte de ahora
-- en adelante, que es la regla que nos interesa.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sales
  add constraint sales_cash_session_id_fkey
  foreign key (cash_session_id) references public.cash_sessions (id) on delete restrict;

alter table public.sales
  add constraint sales_cash_session_required
  check (cash_session_id is not null) not valid;

create index sales_cash_session_idx on public.sales (cash_session_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- current_cash_session: el turno abierto del usuario actual (o null).
--   SECURITY INVOKER → pasa por RLS, así que sólo ve turnos de su organización.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.current_cash_session()
returns uuid
language sql
stable
set search_path = ''
as $$
  select cs.id
  from public.cash_sessions cs
  where cs.opened_by = (select auth.uid())
    and cs.status = 'open'
  order by cs.opened_at desc
  limit 1;
$$;

revoke execute on function public.current_cash_session() from public, anon;
grant  execute on function public.current_cash_session() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- cash_session_totals: desglose del turno y efectivo esperado en el cajón.
--
--   expected_cash = fondo inicial
--                 + ventas en efectivo del turno (TODAS, incl. canceladas)
--                 + ingresos manuales en efectivo
--                 − egresos en efectivo (incluye los reembolsos)
--
--   Ojo con las canceladas: una venta cancelada SÍ suma aquí a propósito. El
--   dinero entró al cajón y el reembolso sale como egreso; si se excluyera la
--   venta, el reembolso descontaría dos veces. Para el corte se usan en cambio
--   los totales netos (`*_sales`, sólo completadas).
--
--   security_invoker → la vista respeta la RLS de las tablas base (PG 15+).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.cash_session_totals
with (security_invoker = true) as
select
  cs.id     as cash_session_id,
  cs.org_id as org_id,
  cs.opening_float,
  s.sales_count,
  s.cash_sales,
  s.card_sales,
  s.transfer_sales,
  s.cash_sales_gross,
  m.cash_income,
  m.cash_expense,
  m.refunds,
  round(
    cs.opening_float + s.cash_sales_gross + m.cash_income - m.cash_expense,
    2
  ) as expected_cash
from public.cash_sessions cs
cross join lateral (
  select
    count(*) filter (where sa.status = 'completed')::int as sales_count,
    -- Netos (sólo completadas): lo que se reporta en el corte.
    coalesce(sum(sa.total) filter (where sa.payment_method = 'cash'     and sa.status = 'completed'), 0) as cash_sales,
    coalesce(sum(sa.total) filter (where sa.payment_method = 'card'     and sa.status = 'completed'), 0) as card_sales,
    coalesce(sum(sa.total) filter (where sa.payment_method = 'transfer' and sa.status = 'completed'), 0) as transfer_sales,
    -- Bruto en efectivo (incluye canceladas): lo que realmente entró al cajón.
    coalesce(sum(sa.total) filter (where sa.payment_method = 'cash'), 0) as cash_sales_gross
  from public.sales sa
  where sa.cash_session_id = cs.id
) s
cross join lateral (
  select
    coalesce(sum(cm.amount) filter (where cm.kind = 'income'  and cm.payment_method = 'cash'), 0) as cash_income,
    coalesce(sum(cm.amount) filter (where cm.kind = 'expense' and cm.payment_method = 'cash'), 0) as cash_expense,
    coalesce(sum(cm.amount) filter (where cm.category = 'sale_refund'), 0) as refunds
  from public.cash_movements cm
  where cm.cash_session_id = cs.id
) m;

comment on view public.cash_session_totals is
  'Desglose por turno (ventas por método, movimientos) y efectivo esperado en caja.';

grant select on public.cash_session_totals to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- open_cash_session: abre el turno del usuario actual.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.open_cash_session(
  p_branch        uuid,
  p_opening_float numeric,
  p_notes         text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid;
  v_id  uuid;
begin
  select o into v_org from public.current_user_org_ids() o limit 1;
  if v_org is null then
    raise exception 'Tu cuenta no pertenece a ninguna organización' using errcode = '42501';
  end if;

  if not public.has_role_in_org(v_org, array['admin','manager','receptionist']::public.app_role[]) then
    raise exception 'Tu rol no puede operar la caja' using errcode = '42501';
  end if;

  if public.current_cash_session() is not null then
    raise exception 'Ya tienes un turno de caja abierto' using errcode = 'P0001';
  end if;

  if p_branch is not null and not public.can_access_branch(p_branch) then
    raise exception 'No puedes operar esa sucursal' using errcode = '42501';
  end if;

  if coalesce(p_opening_float, 0) < 0 then
    raise exception 'El fondo inicial no puede ser negativo' using errcode = '22023';
  end if;

  insert into public.cash_sessions (org_id, branch_id, opened_by, opening_float, open_notes)
  values (v_org, p_branch, (select auth.uid()), round(coalesce(p_opening_float, 0), 2), p_notes)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.open_cash_session(uuid, numeric, text) from public, anon;
grant  execute on function public.open_cash_session(uuid, numeric, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- close_cash_session: cierra el turno y congela el arqueo.
--   Lo cierra su propio cajero o un administrador de la organización.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.close_cash_session(
  p_session      uuid,
  p_counted_cash numeric,
  p_notes        text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_org      uuid;
  v_status   text;
  v_owner    uuid;
  v_expected numeric(10, 2);
  v_counted  numeric(10, 2);
begin
  select cs.org_id, cs.status, cs.opened_by
    into v_org, v_status, v_owner
  from public.cash_sessions cs
  where cs.id = p_session;

  if not found then
    raise exception 'Turno no encontrado' using errcode = 'P0002';
  end if;
  if v_status = 'closed' then
    raise exception 'El turno ya está cerrado' using errcode = 'P0001';
  end if;
  if v_owner <> (select auth.uid()) and not public.is_org_admin(v_org) then
    raise exception 'Sólo el cajero del turno o un administrador pueden cerrarlo'
      using errcode = '42501';
  end if;
  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'Captura el efectivo contado para hacer el arqueo' using errcode = '22023';
  end if;

  v_counted := round(p_counted_cash, 2);

  select t.expected_cash into v_expected
  from public.cash_session_totals t
  where t.cash_session_id = p_session;

  update public.cash_sessions
     set status        = 'closed',
         closed_at     = now(),
         closed_by     = (select auth.uid()),
         counted_cash  = v_counted,
         expected_cash = v_expected,
         difference    = v_counted - v_expected,
         close_notes   = p_notes
   where id = p_session;
end;
$$;

revoke execute on function public.close_cash_session(uuid, numeric, text) from public, anon;
grant  execute on function public.close_cash_session(uuid, numeric, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- register_cash_movement: ingreso/egreso manual en el turno abierto.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.register_cash_movement(
  p_kind           text,
  p_category       text,
  p_amount         numeric,
  p_payment_method text,
  p_description    text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_session uuid;
  v_org     uuid;
  v_id      uuid;
begin
  if p_kind not in ('income', 'expense') then
    raise exception 'Tipo de movimiento inválido' using errcode = '22023';
  end if;
  -- 'sale_refund' lo genera cancel_sale; a mano no se captura.
  if p_category = 'sale_refund' then
    raise exception 'Los reembolsos se registran cancelando la venta' using errcode = 'P0001';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El monto debe ser mayor a cero' using errcode = '22023';
  end if;

  v_session := public.current_cash_session();
  if v_session is null then
    raise exception 'Abre tu turno de caja para registrar movimientos' using errcode = 'P0001';
  end if;

  select cs.org_id into v_org from public.cash_sessions cs where cs.id = v_session;

  insert into public.cash_movements (
    org_id, cash_session_id, kind, category, payment_method, amount, description, created_by
  ) values (
    v_org, v_session, p_kind, coalesce(p_category, 'other'),
    coalesce(p_payment_method, 'cash'), round(p_amount, 2), p_description,
    (select auth.uid())
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.register_cash_movement(text, text, numeric, text, text) from public, anon;
grant  execute on function public.register_cash_movement(text, text, numeric, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- create_membership_sale (v2): ahora exige turno abierto y toma de él la
-- sucursal. Se reemplaza la firma anterior (ya no recibe p_branch).
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.create_membership_sale(uuid, uuid, uuid, uuid, text, text, numeric, text);

create or replace function public.create_membership_sale(
  p_client         uuid,
  p_partner        uuid,
  p_plan           uuid,
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
  v_session   uuid;
  v_sessorg   uuid;
  v_branch    uuid;
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
  if v_org <> v_sessorg then
    raise exception 'La membresía no pertenece a la organización de tu turno' using errcode = '42501';
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

  -- Venta (RLS exige rol de staff en la org). La sucursal sale del turno.
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

revoke execute on function public.create_membership_sale(uuid, uuid, uuid, text, text, numeric, text) from public, anon;
grant  execute on function public.create_membership_sale(uuid, uuid, uuid, text, text, numeric, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- cancel_sale (v2): además de revertir la membresía, registra el EGRESO del
-- reembolso en el turno abierto de quien cancela (especificación §7 · POS).
--   El egreso conserva el método de pago original: sólo el efectivo mueve el
--   cajón; un reembolso a tarjeta queda registrado pero no altera el arqueo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.cancel_sale(p_sale uuid, p_reason text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_org     uuid;
  v_status  text;
  v_total   numeric(10, 2);
  v_date    date;
  v_method  text;
  v_folio   bigint;
  v_session uuid;
  v_sessorg uuid;
begin
  select s.org_id, s.status, s.total, s.sold_at::date, s.payment_method, s.folio
    into v_org, v_status, v_total, v_date, v_method, v_folio
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

  -- El reembolso es dinero que sale: necesita un turno donde registrarse.
  v_session := public.current_cash_session();
  if v_session is null then
    raise exception 'Abre tu turno de caja para registrar el reembolso' using errcode = 'P0001';
  end if;
  select cs.org_id into v_sessorg from public.cash_sessions cs where cs.id = v_session;
  if v_sessorg <> v_org then
    raise exception 'La venta no pertenece a la organización de tu turno' using errcode = '42501';
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

  insert into public.cash_movements (
    org_id, cash_session_id, kind, category, payment_method, amount, description,
    sale_id, created_by
  ) values (
    v_org, v_session, 'expense', 'sale_refund', v_method, v_total,
    'Reembolso de la venta V-' || lpad(v_folio::text, 4, '0'),
    p_sale, (select auth.uid())
  );
end;
$$;

revoke execute on function public.cancel_sale(uuid, text) from public, anon;
grant  execute on function public.cancel_sale(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS · cash_sessions / cash_movements
--   Ver: miembros de la org (el gerente necesita revisar cortes ajenos).
--   Escribir: staff (admin/gerente/recepcionista). Nada se borra: un turno mal
--   abierto se cierra, no se elimina.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.cash_sessions  enable row level security;
alter table public.cash_movements enable row level security;

create policy "cash_sessions: members can read"
  on public.cash_sessions for select to authenticated
  using (public.is_org_member(org_id));

create policy "cash_sessions: staff can insert"
  on public.cash_sessions for insert to authenticated
  with check (
    public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[])
    and opened_by = (select auth.uid())
  );

create policy "cash_sessions: staff can update"
  on public.cash_sessions for update to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]))
  with check (public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[]));

create policy "cash_movements: members can read"
  on public.cash_movements for select to authenticated
  using (public.is_org_member(org_id));

create policy "cash_movements: staff can insert"
  on public.cash_movements for insert to authenticated
  with check (
    public.has_role_in_org(org_id, array['admin','manager','receptionist']::public.app_role[])
  );
