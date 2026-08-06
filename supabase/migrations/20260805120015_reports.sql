-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0015 · Fase 1 · Cortes y estadísticas (agregados de ventas)                ║
-- ║                                                                            ║
-- ║ Funciones de agregación para los cortes diario/semanal/mensual y sus       ║
-- ║ gráficas. Todas son SECURITY INVOKER: la agregación corre bajo RLS, así    ║
-- ║ que un usuario sólo suma las ventas de SU organización.                    ║
-- ║                                                                            ║
-- ║ Por qué agregar en la base y no en la app: traer todas las ventas del mes  ║
-- ║ a Node para sumarlas no escala y expone más datos de los necesarios.       ║
-- ║ Cuando el volumen lo pida, estas mismas firmas pueden respaldarse con      ║
-- ║ vistas materializadas refrescadas por job (especificación §6) sin tocar    ║
-- ║ la app.                                                                    ║
-- ║                                                                            ║
-- ║ Zona horaria: `sold_at` es timestamptz. El corte de un día es un concepto  ║
-- ║ LOCAL, así que el rango se convierte a UTC con la zona de la organización  ║
-- ║ (`p_tz`) y los agrupamientos por día/hora se hacen en esa misma zona. El   ║
-- ║ filtro se queda sobre `sold_at` desnudo para poder usar el índice          ║
-- ║ (org_id, sold_at desc).                                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Resumen del periodo: ingresos desglosados, reembolsos y movimientos de caja.
--
--   · `total` y su desglose (subtotal, IVA, por método) cuentan sólo las ventas
--     COMPLETADAS: es lo que se vendió y se quedó vendido en el periodo.
--
--   · `net_revenue` parte en cambio de `gross_total`, que incluye TAMBIÉN las
--     canceladas, y le resta los reembolsos efectivamente pagados en el periodo
--     (movimientos `sale_refund`, fechados por cuándo salió el dinero). Es el
--     mismo criterio del arqueo de caja, y por dos razones:
--       — Si se restara de `total`, una venta cancelada se penalizaría dos
--         veces: ya está excluida del total Y volvería a restar como reembolso.
--       — Un reembolso de una venta de un periodo anterior sale del cajón HOY;
--         fecharlo por la venta lo dejaría fuera del corte de hoy.
--     Así, vender 522 y cancelarlo el mismo día da neto 0, no −522.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sales_summary(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (
  sales_count     integer,
  subtotal        numeric,
  discount_amount numeric,
  tax_amount      numeric,
  total           numeric,
  gross_total     numeric,
  avg_ticket      numeric,
  cash_total      numeric,
  card_total      numeric,
  transfer_total  numeric,
  refunds_count   integer,
  refunds_total   numeric,
  cash_in         numeric,
  cash_out        numeric,
  net_revenue     numeric,
  new_clients     integer
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)      as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz)  as to_ts
  ),
  s as (
    select sa.*
    from public.sales sa, bounds b
    where sa.sold_at >= b.from_ts
      and sa.sold_at <  b.to_ts
      and (p_branch is null or sa.branch_id = p_branch)
  ),
  -- Movimientos de caja del periodo, fechados por cuándo se movió el dinero.
  m as (
    select
      coalesce(sum(cm.amount) filter (where cm.category = 'sale_refund'), 0) as refunds_total,
      count(*) filter (where cm.category = 'sale_refund')::integer           as refunds_count,
      coalesce(sum(cm.amount) filter (where cm.kind = 'income'  and cm.category <> 'sale_refund'), 0) as cash_in,
      coalesce(sum(cm.amount) filter (where cm.kind = 'expense' and cm.category <> 'sale_refund'), 0) as cash_out
    from public.cash_movements cm, bounds b
    where cm.created_at >= b.from_ts
      and cm.created_at <  b.to_ts
  ),
  c as (
    select count(*)::integer as n
    from public.clients cl, bounds b
    where cl.created_at >= b.from_ts
      and cl.created_at <  b.to_ts
      and (p_branch is null or cl.branch_id = p_branch)
  )
  select
    count(*) filter (where s.status = 'completed')::integer,
    coalesce(sum(s.subtotal)        filter (where s.status = 'completed'), 0),
    coalesce(sum(s.discount_amount) filter (where s.status = 'completed'), 0),
    coalesce(sum(s.tax_amount)      filter (where s.status = 'completed'), 0),
    coalesce(sum(s.total)           filter (where s.status = 'completed'), 0),
    coalesce(sum(s.total), 0),
    round(
      coalesce(sum(s.total) filter (where s.status = 'completed'), 0)
      / nullif(count(*) filter (where s.status = 'completed'), 0),
      2
    ),
    coalesce(sum(s.total) filter (where s.status = 'completed' and s.payment_method = 'cash'), 0),
    coalesce(sum(s.total) filter (where s.status = 'completed' and s.payment_method = 'card'), 0),
    coalesce(sum(s.total) filter (where s.status = 'completed' and s.payment_method = 'transfer'), 0),
    (select m.refunds_count from m),
    (select m.refunds_total from m),
    (select m.cash_in       from m),
    (select m.cash_out      from m),
    coalesce(sum(s.total), 0)
      - (select m.refunds_total from m)
      + (select m.cash_in       from m)
      - (select m.cash_out      from m),
    (select c.n from c)
  from s;
$$;

comment on function public.sales_summary(date, date, uuid, text) is
  'Resumen financiero de un periodo: ingresos, IVA, reembolsos y neto.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Serie por día (para la gráfica de ingresos). Rellena los días sin venta con
-- ceros para que la gráfica no tenga huecos.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sales_by_day(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (day date, sales_count integer, total numeric)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  ),
  days as (
    select generate_series(p_from, p_to, interval '1 day')::date as day
  ),
  agg as (
    select ((sa.sold_at at time zone p_tz)::date) as day,
           count(*)::integer                      as sales_count,
           sum(sa.total)                          as total
    from public.sales sa, bounds b
    where sa.sold_at >= b.from_ts
      and sa.sold_at <  b.to_ts
      and sa.status = 'completed'
      and (p_branch is null or sa.branch_id = p_branch)
    group by 1
  )
  select d.day,
         coalesce(a.sales_count, 0),
         coalesce(a.total, 0)
  from days d
  left join agg a on a.day = d.day
  order by d.day;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ventas por membresía (más vendida / menos vendida). Usa el snapshot del
-- nombre en sale_items: si el plan se renombró o borró, el corte histórico
-- sigue diciendo lo que se vendió ese día.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sales_by_plan(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (plan_name text, quantity integer, total numeric)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  )
  select si.description,
         sum(si.quantity)::integer,
         sum(si.line_total)
  from public.sale_items si
  join public.sales sa on sa.id = si.sale_id
  cross join bounds b
  where sa.sold_at >= b.from_ts
    and sa.sold_at <  b.to_ts
    and sa.status = 'completed'
    and (p_branch is null or sa.branch_id = p_branch)
  group by si.description
  order by sum(si.line_total) desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ventas por empleado (cajero).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sales_by_cashier(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (cashier_id uuid, cashier_name text, sales_count integer, total numeric)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  )
  select sa.cashier_id,
         coalesce(p.full_name, 'Sin cajero'),
         count(*)::integer,
         sum(sa.total)
  from public.sales sa
  cross join bounds b
  left join public.profiles p on p.id = sa.cashier_id
  where sa.sold_at >= b.from_ts
    and sa.sold_at <  b.to_ts
    and sa.status = 'completed'
    and (p_branch is null or sa.branch_id = p_branch)
  group by sa.cashier_id, p.full_name
  order by sum(sa.total) desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ventas por hora del día (horarios de mayor venta). Devuelve las 24 horas
-- para que la gráfica tenga el día completo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sales_by_hour(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (hour integer, sales_count integer, total numeric)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  ),
  hours as (
    select generate_series(0, 23) as hour
  ),
  agg as (
    select extract(hour from (sa.sold_at at time zone p_tz))::integer as hour,
           count(*)::integer                                          as sales_count,
           sum(sa.total)                                              as total
    from public.sales sa, bounds b
    where sa.sold_at >= b.from_ts
      and sa.sold_at <  b.to_ts
      and sa.status = 'completed'
      and (p_branch is null or sa.branch_id = p_branch)
    group by 1
  )
  select h.hour,
         coalesce(a.sales_count, 0),
         coalesce(a.total, 0)
  from hours h
  left join agg a on a.hour = h.hour
  order by h.hour;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Detalle de ventas del periodo (fuente del export a Excel/CSV).
--   Una fila por venta, ya resuelta contra cliente, cajero y sucursal, para no
--   hacer N+1 consultas desde la app al exportar.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sales_detail(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (
  sold_at         timestamptz,
  folio           bigint,
  member_number   integer,
  client_name     text,
  items           text,
  cashier_name    text,
  branch_name     text,
  payment_method  text,
  subtotal        numeric,
  discount_amount numeric,
  tax_amount      numeric,
  total           numeric,
  status          text
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  )
  select sa.sold_at,
         sa.folio,
         cl.member_number,
         (cl.first_name || ' ' || cl.last_name),
         (select string_agg(
                   si.description ||
                   case when si.quantity > 1 then ' x' || si.quantity else '' end,
                   ', ' order by si.created_at)
            from public.sale_items si where si.sale_id = sa.id),
         coalesce(pr.full_name, ''),
         coalesce(br.name, ''),
         sa.payment_method,
         sa.subtotal,
         sa.discount_amount,
         sa.tax_amount,
         sa.total,
         sa.status
  from public.sales sa
  cross join bounds b
  left join public.clients  cl on cl.id = sa.client_id
  left join public.profiles pr on pr.id = sa.cashier_id
  left join public.branches br on br.id = sa.branch_id
  where sa.sold_at >= b.from_ts
    and sa.sold_at <  b.to_ts
    and (p_branch is null or sa.branch_id = p_branch)
  order by sa.sold_at;
$$;

comment on function public.sales_detail(date, date, uuid, text) is
  'Detalle de ventas del periodo, ya resuelto: alimenta el export a Excel/CSV.';

-- Sólo staff autenticado (RLS hace el resto del filtrado dentro de cada una).
revoke execute on function public.sales_summary(date, date, uuid, text)    from public, anon;
revoke execute on function public.sales_by_day(date, date, uuid, text)     from public, anon;
revoke execute on function public.sales_by_plan(date, date, uuid, text)    from public, anon;
revoke execute on function public.sales_by_cashier(date, date, uuid, text) from public, anon;
revoke execute on function public.sales_by_hour(date, date, uuid, text)    from public, anon;
revoke execute on function public.sales_detail(date, date, uuid, text)     from public, anon;

grant execute on function public.sales_summary(date, date, uuid, text)    to authenticated;
grant execute on function public.sales_by_day(date, date, uuid, text)     to authenticated;
grant execute on function public.sales_by_plan(date, date, uuid, text)    to authenticated;
grant execute on function public.sales_by_cashier(date, date, uuid, text) to authenticated;
grant execute on function public.sales_by_hour(date, date, uuid, text)    to authenticated;
grant execute on function public.sales_detail(date, date, uuid, text)     to authenticated;
