-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Renta de artículos y reportes de inventario                        ║
-- ║                                                                            ║
-- ║ Del préstamo importa que la pieza salga del anaquel sin pasar por caja     ║
-- ║ (no es una venta), que vuelva al devolverse, y que una pérdida se registre ║
-- ║ como merma para que la bitácora explique por qué dejó de existir.          ║
-- ║                                                                            ║
-- ║ De los reportes importa que la utilidad use el costo VIGENTE AL VENDER: si ║
-- ║ el proveedor sube el precio después, la utilidad de una venta vieja no     ║
-- ║ puede cambiar sola.                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(18);

set local role postgres;

create temporary table hoy as
  select (now() at time zone 'America/Mexico_City')::date as d;
grant select on hoy to authenticated;

-- Toalla (rentable) y una proteína (sólo venta).
insert into public.products (id, org_id, name, sku, cost, price, is_rentable)
values
  ('aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Toalla', 'TOA-1', 40, 25, true),
  ('bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Proteína 2 kg', 'PRO-2K', 500, 890, false);

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select public.open_cash_session('a1111111-1111-1111-1111-111111111111', 0, null);
select public.register_stock_movement(
  'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111',
  'purchase', 20, 40, 'Compra de toallas');
-- Primera compra de proteína a 500: es el costo que debe usar la venta.
select public.register_stock_movement(
  'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111',
  'purchase', 10, 500, 'Compra inicial');

-- ── Préstamo ─────────────────────────────────────────────────────────────────
create temporary table prestamo as
select public.rent_product(
  'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select id from public.clients where first_name = 'Juan' limit 1),
  'a1111111-1111-1111-1111-111111111111', 2, 4, 'Clase de spinning') as id;
grant select on prestamo to authenticated;

select is(
  (select ps.quantity from public.product_stock ps
    where ps.product_id = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  18,
  'Prestar saca las piezas del anaquel'
);

select is(
  (select count(*)::int from public.cash_movements),
  0,
  'Prestar NO toca la caja: un préstamo no es una venta'
);

select is(
  (select count(*)::int from public.pending_rentals),
  1,
  'El préstamo aparece entre los pendientes de devolución'
);

select is(
  (select pr.overdue from public.pending_rentals pr),
  false,
  'Aún no está vencido: tiene 4 horas de plazo'
);

select throws_ok(
  $$ select public.rent_product(
       'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       (select id from public.clients where first_name = 'Juan' limit 1),
       'a1111111-1111-1111-1111-111111111111', 1) $$,
  'P0001',
  NULL,
  'Un artículo que no es rentable no se presta'
);

select throws_ok(
  $$ select public.rent_product(
       'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       (select id from public.clients where first_name = 'Juan' limit 1),
       'a1111111-1111-1111-1111-111111111111', 999) $$,
  'P0001',
  NULL,
  'No se presta lo que no hay en el anaquel'
);

-- ── Devolución ───────────────────────────────────────────────────────────────
select lives_ok(
  $$ select public.return_rental((select id from prestamo)) $$,
  'Se registra la devolución'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.product_id = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  20,
  'Las piezas devueltas regresan al anaquel'
);

select is(
  (select count(*)::int from public.pending_rentals),
  0,
  'Ya no aparece entre los pendientes'
);

select throws_ok(
  $$ select public.return_rental((select id from prestamo)) $$,
  'P0001',
  NULL,
  'Un préstamo cerrado no se devuelve dos veces'
);

-- ── Préstamo perdido ─────────────────────────────────────────────────────────
create temporary table perdido as
select public.rent_product(
  'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  (select id from public.clients where first_name = 'Ana' limit 1),
  'a1111111-1111-1111-1111-111111111111', 1, null, null) as id;
grant select on perdido to authenticated;

select lives_ok(
  $$ select public.return_rental((select id from perdido), true, 'No la regresó') $$,
  'Un préstamo se puede dar por perdido'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.product_id = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  19,
  'La pieza perdida NO regresa al anaquel'
);

select is(
  (select count(*)::int from public.stock_movements sm
    where sm.kind = 'loss' and sm.product_id = 'aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1,
  'Y queda como merma en la bitácora, con su explicación'
);

-- ── Reportes ─────────────────────────────────────────────────────────────────
-- Se vende una proteína al precio de catálogo (890) con costo vigente 500.
select public.create_sale(
  null, null, null,
  jsonb_build_array(jsonb_build_object(
    'product_id', 'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'quantity', 2)),
  'cash', 'none', 0, null);

-- El proveedor sube el costo DESPUÉS de la venta.
select public.register_stock_movement(
  'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111',
  'purchase', 5, 700, 'Compra más cara');
update public.products set cost = 700
 where id = 'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is(
  (select r.quantity from hoy t,
     lateral public.product_sales_report(t.d, t.d) r
    where r.product_id = 'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  2,
  'El reporte cuenta las piezas vendidas'
);

select is(
  (select r.revenue from hoy t,
     lateral public.product_sales_report(t.d, t.d) r
    where r.product_id = 'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1780.00::numeric,
  'El ingreso es 2 × 890, sin IVA'
);

select is(
  (select r.cost from hoy t,
     lateral public.product_sales_report(t.d, t.d) r
    where r.product_id = 'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1000.00::numeric,
  'El costo es el VIGENTE AL VENDER (500), no el nuevo del catálogo (700)'
);

select is(
  (select r.profit from hoy t,
     lateral public.product_sales_report(t.d, t.d) r
    where r.product_id = 'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  780.00::numeric,
  'La utilidad no cambia porque el proveedor suba después'
);

-- Una línea cancelada deja de contar como vendida.
select public.cancel_sale_item(
  (select si.id from public.sale_items si
    where si.product_id = 'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa' limit 1),
  'Prueba');

select is(
  (select count(*)::int from hoy t,
     lateral public.product_sales_report(t.d, t.d) r
    where r.product_id = 'bbbb1111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  0,
  'Una línea cancelada no infla el «más vendido»'
);

select * from finish();
rollback;
