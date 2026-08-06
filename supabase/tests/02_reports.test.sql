-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Cortes y estadísticas (agregados de ventas)                        ║
-- ║                                                                            ║
-- ║ Verifica que los agregados cuadren con la aritmética del POS (IVA 16%,     ║
-- ║ descuentos) y —lo importante— que NO crucen inquilinos: una función que    ║
-- ║ suma es tan peligrosa como una que lista si se salta la RLS.               ║
-- ║                                                                            ║
-- ║ Las fechas se calculan en la zona de la organización, no con `current_date`║
-- ║ (el servidor corre en UTC y a las 22:00 de CDMX ya sería el día siguiente).║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(22);

-- Fecha "de hoy" según el gimnasio, no según el servidor.
-- La tabla temporal nace del rol `postgres`, así que hay que abrirla al rol
-- `authenticated` con el que se simulan las sesiones más abajo.
create temporary table tz_today as
  select (now() at time zone 'America/Mexico_City')::date as d;
grant select on tz_today to authenticated;

-- ── Sesión: Admin A (Iron Temple) ────────────────────────────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ select public.open_cash_session(
       'a1111111-1111-1111-1111-111111111111', 500, null) $$,
  'Admin A abre turno para poder vender'
);

-- Mensual, efectivo, sin descuento → 450 + 16% = 522.00
select lives_ok(
  $$ select public.create_membership_sale(
       (select id from clients where first_name = 'Juan' limit 1), null,
       (select id from membership_plans where name = 'Mensual' limit 1),
       'cash', 'none', 0, null) $$,
  'Venta 1: Mensual en efectivo'
);

-- Semanal, tarjeta, 10% → base 150 − 15 = 135; IVA 21.60; total 156.60
select lives_ok(
  $$ select public.create_membership_sale(
       (select id from clients where first_name = 'Ana' limit 1), null,
       (select id from membership_plans where name = 'Semanal' limit 1),
       'card', 'percent', 10, null) $$,
  'Venta 2: Semanal con tarjeta y 10% de descuento'
);

-- ── Resumen del día ──────────────────────────────────────────────────────────
select is(
  (select s.sales_count from tz_today t,
     lateral public.sales_summary(t.d, t.d) s),
  2,
  'El resumen cuenta las 2 ventas del día'
);

select is(
  (select s.total from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  678.60::numeric,
  'Ingresos = 522.00 + 156.60'
);

select is(
  (select s.subtotal from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  600.00::numeric,
  'Subtotal sin IVA = 450 + 150'
);

select is(
  (select s.discount_amount from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  15.00::numeric,
  'El 10% de descuento sobre la Semanal son 15.00'
);

select is(
  (select s.tax_amount from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  93.60::numeric,
  'IVA = 72.00 + 21.60'
);

select is(
  (select s.cash_total from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  522.00::numeric,
  'El desglose separa el efectivo'
);

select is(
  (select s.card_total from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  156.60::numeric,
  'El desglose separa la tarjeta'
);

select is(
  (select s.avg_ticket from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  339.30::numeric,
  'Ticket promedio = 678.60 / 2'
);

-- ── Series y agrupaciones ────────────────────────────────────────────────────
select is(
  (select count(*)::int from tz_today t, lateral public.sales_by_day(t.d - 2, t.d)),
  3,
  'sales_by_day rellena los días sin venta (3 días = 3 filas)'
);

select is(
  (select d.total from tz_today t,
     lateral public.sales_by_day(t.d - 2, t.d) d where d.day = t.d),
  678.60::numeric,
  'La serie por día carga las ventas en el día local correcto'
);

select is(
  (select count(*)::int from tz_today t, lateral public.sales_by_plan(t.d, t.d)),
  2,
  'sales_by_plan devuelve una fila por membresía vendida'
);

select is(
  (select p.plan_name from tz_today t,
     lateral public.sales_by_plan(t.d, t.d) p limit 1),
  'Mensual',
  'La membresía más vendida encabeza el ranking'
);

select is(
  (select c.total from tz_today t,
     lateral public.sales_by_cashier(t.d, t.d) c),
  678.60::numeric,
  'Ventas por empleado suma todo al único cajero'
);

select is(
  (select count(*)::int from tz_today t, lateral public.sales_by_hour(t.d, t.d)),
  24,
  'sales_by_hour devuelve el día completo (24 horas)'
);

select is(
  (select sum(h.sales_count)::int from tz_today t,
     lateral public.sales_by_hour(t.d, t.d) h),
  2,
  'Las 2 ventas caen dentro de alguna hora del día'
);

select is(
  (select count(*)::int from tz_today t, lateral public.sales_detail(t.d, t.d)),
  2,
  'El detalle para exportar trae las 2 ventas'
);

-- ── Cancelación: el neto no castiga dos veces ────────────────────────────────
select lives_ok(
  $$ select public.cancel_sale(
       (select id from sales where payment_method = 'cash' limit 1),
       'Prueba de corte') $$,
  'Se cancela la venta en efectivo (522.00)'
);

select is(
  (select s.net_revenue from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  156.60::numeric,
  'Neto = bruto 678.60 − reembolso 522.00 (la cancelada no resta dos veces)'
);

-- ── Aislamiento: los agregados NO cruzan inquilinos ──────────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select is(
  (select s.total from tz_today t, lateral public.sales_summary(t.d, t.d) s),
  0::numeric,
  'Admin B NO ve ni un peso de los ingresos de la org A'
);

select * from finish();
rollback;
