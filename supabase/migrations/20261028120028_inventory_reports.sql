-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0028 · Fase 4 · Rebanada D · Reportes de inventario                       ║
-- ║                                                                            ║
-- ║ LA UTILIDAD SE CALCULA CON EL COSTO DEL MOMENTO DE LA VENTA, no con el     ║
-- ║ costo actual del catálogo. Si el proveedor sube el precio en marzo, la     ║
-- ║ utilidad de enero no puede cambiar sola. Ese costo se toma del movimiento  ║
-- ║ de entrada más reciente ANTERIOR a la venta; si no hay ninguno, se cae al  ║
-- ║ costo del catálogo y se marca la fila como estimada.                       ║
-- ║                                                                            ║
-- ║ LAS LÍNEAS CANCELADAS NO CUENTAN como vendidas: se devolvieron y el        ║
-- ║ producto regresó al anaquel. Contarlas inflaría el «más vendido» con       ║
-- ║ ventas que se deshicieron.                                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Productos vendidos en el periodo: cuánto, cuánto se cobró y qué se ganó.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.product_sales_report(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (
  product_id   uuid,
  product_name text,
  quantity     integer,
  revenue      numeric,  -- sin IVA y sin descuento del ticket
  cost         numeric,
  profit       numeric,
  margin_pct   numeric,
  estimated    boolean   -- el costo salió del catálogo, no de una compra real
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  ),
  lineas as (
    select si.product_id,
           si.description,
           si.quantity,
           si.line_total,
           sa.sold_at,
           -- Costo vigente al vender: la última compra anterior a la venta.
           (select sm.unit_cost
              from public.stock_movements sm
             where sm.product_id = si.product_id
               and sm.kind = 'purchase'
               and sm.unit_cost is not null
               and sm.created_at <= sa.sold_at
             order by sm.created_at desc
             limit 1) as hist_cost,
           p.cost as catalog_cost
    from public.sale_items si
    join public.sales sa on sa.id = si.sale_id
    join public.products p on p.id = si.product_id
    cross join bounds b
    where si.product_id is not null
      -- Una línea cancelada se devolvió: no se vendió.
      and si.cancelled_at is null
      and sa.status <> 'cancelled'
      and sa.sold_at >= b.from_ts
      and sa.sold_at <  b.to_ts
      and (p_branch is null or sa.branch_id = p_branch)
  )
  select l.product_id,
         max(l.description),
         sum(l.quantity)::integer,
         sum(l.line_total),
         sum(coalesce(l.hist_cost, l.catalog_cost) * l.quantity),
         sum(l.line_total) - sum(coalesce(l.hist_cost, l.catalog_cost) * l.quantity),
         case when sum(l.line_total) = 0 then 0
              else round(
                (sum(l.line_total) - sum(coalesce(l.hist_cost, l.catalog_cost) * l.quantity))
                * 100 / sum(l.line_total), 1)
         end,
         bool_or(l.hist_cost is null)
  from lineas l
  group by l.product_id
  order by sum(l.line_total) desc;
$$;

comment on function public.product_sales_report(date, date, uuid, text) is
  'Productos vendidos, ingreso y utilidad usando el costo vigente al vender.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Valuación del inventario: cuánto dinero hay parado en el anaquel.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.inventory_valuation(p_branch uuid default null)
returns table (
  product_id    uuid,
  product_name  text,
  sku           text,
  branch_id     uuid,
  branch_name   text,
  quantity      integer,
  unit_cost     numeric,
  stock_value   numeric,
  retail_value  numeric,  -- a precio de venta, sin IVA
  min_quantity  integer,
  below_min     boolean
)
language sql
stable
set search_path = ''
as $$
  select p.id,
         p.name,
         p.sku,
         b.id,
         b.name,
         ps.quantity,
         p.cost,
         round(ps.quantity * p.cost, 2),
         round(ps.quantity * p.price, 2),
         ps.min_quantity,
         (ps.min_quantity is not null and ps.quantity <= ps.min_quantity)
  from public.product_stock ps
  join public.products p on p.id = ps.product_id
  join public.branches b on b.id = ps.branch_id
  where p.track_stock
    and (p_branch is null or ps.branch_id = p_branch)
  order by p.name, b.name;
$$;

comment on function public.inventory_valuation(uuid) is
  'Existencias valuadas a costo y a precio de venta, por sucursal.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Detalle de movimientos del periodo (fuente del export).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.stock_movements_detail(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (
  created_at   timestamptz,
  product_name text,
  sku          text,
  branch_name  text,
  kind         text,
  signed_qty   integer,
  unit_cost    numeric,
  notes        text,
  actor        text
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  )
  select sm.created_at,
         p.name,
         p.sku,
         b.name,
         sm.kind,
         -- El signo se aplica aquí para que el export se pueda sumar directo.
         (sm.quantity * public.stock_movement_sign(sm.kind)),
         sm.unit_cost,
         sm.notes,
         coalesce(pr.full_name, '')
  from public.stock_movements sm
  join public.products p on p.id = sm.product_id
  join public.branches b on b.id = sm.branch_id
  left join public.profiles pr on pr.id = sm.created_by
  cross join bounds bo
  where sm.created_at >= bo.from_ts
    and sm.created_at <  bo.to_ts
    and (p_branch is null or sm.branch_id = p_branch)
  order by sm.created_at desc;
$$;

revoke execute on function public.product_sales_report(date, date, uuid, text)     from public, anon;
revoke execute on function public.inventory_valuation(uuid)                        from public, anon;
revoke execute on function public.stock_movements_detail(date, date, uuid, text)   from public, anon;

grant execute on function public.product_sales_report(date, date, uuid, text)      to authenticated;
grant execute on function public.inventory_valuation(uuid)                         to authenticated;
grant execute on function public.stock_movements_detail(date, date, uuid, text)    to authenticated;
