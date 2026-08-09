-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Venta de productos en el POS y cancelación por línea                ║
-- ║                                                                            ║
-- ║ Lo que hay que demostrar: que un ticket mixto cobra bien, que vender       ║
-- ║ descuenta del anaquel correcto, que cancelar UNA línea devuelve su parte   ║
-- ║ PROPORCIONAL del descuento —no el importe completo— y regresa el producto, ║
-- ║ y que los montos guardados del ticket no se reescriben: lo que ya cuadró   ║
-- ║ en un turno cerrado tiene que seguir cuadrando.                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(21);

set local role postgres;

-- Catálogo: Proteína 890 y Agua 15 (precios SIN IVA).
insert into public.products (id, org_id, name, sku, cost, price)
values
  ('11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Proteína 2 kg', 'PRO-2K', 520, 890),
  ('22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Agua 1 L', 'AGUA-1L', 6, 15);

-- ── Sesión: Admin de Iron Temple ─────────────────────────────────────────────
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select public.open_cash_session('a1111111-1111-1111-1111-111111111111', 0, null);
select public.register_stock_movement(
  '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111',
  'purchase', 10, 520, 'Surtido');
select public.register_stock_movement(
  '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111',
  'purchase', 24, 6, 'Surtido');

-- ── Ticket mixto: Mensual (450) + Proteína (890) + 2 Aguas (30), 10% dcto ────
-- subtotal 1370 − 137 = 1233; IVA 197.28; total 1430.28
create temporary table venta as
select public.create_sale(
  (select id from public.clients where first_name = 'Juan' limit 1),
  null,
  (select id from public.membership_plans where name = 'Mensual' limit 1),
  jsonb_build_array(
    jsonb_build_object('product_id', '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'quantity', 1),
    jsonb_build_object('product_id', '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'quantity', 2)
  ),
  'cash', 'percent', 10, null) as id;
grant select on venta to authenticated;

select is(
  (select s.subtotal from public.sales s, venta v where s.id = v.id),
  1370.00::numeric,
  'El subtotal suma membresía y productos (450 + 890 + 30)'
);

select is(
  (select s.total from public.sales s, venta v where s.id = v.id),
  1430.28::numeric,
  'El total aplica el 10% de descuento y luego el IVA'
);

select is(
  (select count(*)::int from public.sale_items si, venta v where si.sale_id = v.id),
  3,
  'El ticket lleva 3 líneas en un solo cobro'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.product_id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  9,
  'Vender descuenta del anaquel de la sucursal del turno'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.product_id = '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  22,
  'Se descuentan las 2 piezas de la segunda línea'
);

select is(
  (select count(*)::int from public.client_memberships cm, venta v where cm.sale_id = v.id),
  1,
  'La línea de membresía otorgó su vigencia'
);

-- ── Cancelar SÓLO la línea de la proteína ────────────────────────────────────
-- Su parte del descuento: 1233 × (890 / 1370) = 801.00 → con IVA 929.16
create temporary table linea as
select si.id from public.sale_items si, venta v
where si.sale_id = v.id and si.product_id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
grant select on linea to authenticated;

select is(
  (select public.cancel_sale_item((select id from linea), 'El socio se arrepintió')),
  929.16::numeric,
  'Se devuelve la parte PROPORCIONAL del descuento, no el importe completo'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.product_id = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  10,
  'El producto cancelado regresa al anaquel'
);

select is(
  (select s.total from public.sales s, venta v where s.id = v.id),
  1430.28::numeric,
  'Los montos guardados del ticket NO se reescriben (un turno cerrado seguiría cuadrando)'
);

select is(
  (select s.status from public.sales s, venta v where s.id = v.id),
  'completed',
  'El ticket sigue vigente: aún tiene líneas sin cancelar'
);

select is(
  (select s.refund_amount from public.sales s, venta v where s.id = v.id),
  929.16::numeric,
  'Lo devuelto se acumula en el ticket'
);

select is(
  (select count(*)::int from public.cash_movements cm
    where cm.category = 'sale_refund'),
  1,
  'El reembolso sale como egreso del turno'
);

select is(
  (select count(*)::int from public.client_memberships cm, venta v
    where cm.sale_id = v.id and cm.status = 'active'),
  1,
  'Cancelar un producto NO toca la membresía del mismo ticket'
);

select throws_ok(
  $$ select public.cancel_sale_item((select id from linea), 'otra vez') $$,
  'P0001',
  NULL,
  'Una línea ya cancelada no se puede cancelar dos veces'
);

-- ── Cancelar la línea de la membresía ────────────────────────────────────────
select lives_ok(
  $$ select public.cancel_sale_item(
       (select si.id from public.sale_items si, venta v
         where si.sale_id = v.id and si.membership_plan_id is not null),
       'Se dio de baja') $$,
  'Se cancela la línea de la membresía'
);

select is(
  (select count(*)::int from public.client_memberships cm, venta v
    where cm.sale_id = v.id and cm.status = 'cancelled'),
  1,
  'Cancelar esa línea SÍ revierte la vigencia otorgada'
);

select is(
  (select s.status from public.sales s, venta v where s.id = v.id),
  'completed',
  'El ticket sigue vigente mientras quede el agua sin cancelar'
);

-- Al cancelar la última línea, el ticket entero queda cancelado.
select lives_ok(
  $$ select public.cancel_sale_item(
       (select si.id from public.sale_items si, venta v
         where si.sale_id = v.id and si.cancelled_at is null),
       'Última línea') $$,
  'Se cancela la última línea que quedaba'
);

select is(
  (select s.status from public.sales s, venta v where s.id = v.id),
  'cancelled',
  'Sin líneas vigentes, el ticket queda cancelado'
);

-- ── Venta de sólo productos, sin socio ───────────────────────────────────────
select lives_ok(
  $$ select public.create_sale(
       null, null, null,
       jsonb_build_array(jsonb_build_object(
         'product_id', '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'quantity', 1)),
       'cash', 'none', 0, null) $$,
  'Un ticket de sólo productos no exige socio (público general)'
);

-- ── No se vende lo que no hay ────────────────────────────────────────────────
select throws_ok(
  $$ select public.create_sale(
       null, null, null,
       jsonb_build_array(jsonb_build_object(
         'product_id', '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'quantity', 999)),
       'cash', 'none', 0, null) $$,
  'P0001',
  NULL,
  'Sin existencias suficientes la venta entera se deshace'
);

select * from finish();
rollback;
