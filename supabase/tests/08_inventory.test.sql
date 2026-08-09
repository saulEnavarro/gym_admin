-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Catálogo e inventario                                              ║
-- ║                                                                            ║
-- ║ Lo que importa demostrar: que el saldo y el libro no se separan nunca, que ║
-- ║ no se puede vender lo que no hay, que un traspaso ni crea ni destruye      ║
-- ║ piezas, y que el catálogo es de la organización mientras las existencias   ║
-- ║ son de la sucursal.                                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(22);

-- ── Categorías ───────────────────────────────────────────────────────────────
set local role postgres;

select is(
  (select count(*)::int from public.product_categories
    where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  8,
  'La organización nace con las 8 categorías del catálogo'
);

-- Una organización creada después también, por el trigger.
insert into public.organizations (id, name, slug)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Gimnasio Nuevo', 'gym-nuevo');

select is(
  (select count(*)::int from public.product_categories
    where org_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  8,
  'Una organización nueva nace con sus categorías (no hay que inventarlas)'
);

-- El mismo SKU en otra organización debe poder existir: el índice único es por
-- organización. Se prueba como postgres porque el admin de A —con razón— no
-- puede escribir en la organización C; aquí se verifica el índice, no la RLS.
insert into public.products (org_id, name, sku, price)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Proteína 2 kg', 'PRO-2K', 890);

select lives_ok(
  $$ insert into public.products (org_id, name, sku, price)
     values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Proteína', 'PRO-2K', 100) $$,
  'El mismo SKU SÍ puede repetirse en otra organización'
);

delete from public.products where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- ── Sesión: Admin de Iron Temple ─────────────────────────────────────────────
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ insert into public.products (org_id, category_id, name, sku, cost, price)
     select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', id, 'Proteína 2 kg', 'PRO-2K', 520, 890
       from public.product_categories
      where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and name = 'Proteínas' $$,
  'El admin da de alta un producto en el catálogo'
);

select throws_ok(
  $$ insert into public.products (org_id, name, sku, price)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Otra proteína', 'PRO-2K', 100) $$,
  '23505',
  NULL,
  'El SKU no se puede repetir dentro de la organización'
);


-- ── Existencias por sucursal ─────────────────────────────────────────────────
create temporary table prod as
  select id from public.products where sku = 'PRO-2K'
     and org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
grant select on prod to authenticated;

select lives_ok(
  $$ select public.register_stock_movement(
       (select id from prod), 'a1111111-1111-1111-1111-111111111111',
       'purchase', 10, 520, 'Compra inicial') $$,
  'Una compra ingresa piezas a la sucursal'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.branch_id = 'a1111111-1111-1111-1111-111111111111'),
  10,
  'El saldo de la sucursal refleja la entrada'
);

select is(
  (select count(*)::int from public.stock_movements),
  1,
  'Y el libro guarda el movimiento que lo explica'
);

select is(
  (select coalesce(ps.quantity, 0) from public.product_stock ps
    where ps.branch_id = 'a2222222-2222-2222-2222-222222222222'),
  NULL,
  'La otra sucursal sigue sin existencias: el inventario es de cada anaquel'
);

-- ── No se puede sacar lo que no hay ──────────────────────────────────────────
select throws_ok(
  $$ select public.register_stock_movement(
       (select id from prod), 'a1111111-1111-1111-1111-111111111111',
       'sale', 11) $$,
  'P0001',
  NULL,
  'No se puede sacar más de lo que hay en el anaquel'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.branch_id = 'a1111111-1111-1111-1111-111111111111'),
  10,
  'Un movimiento rechazado no deja el saldo a medias'
);

-- ── Traspaso: ni crea ni destruye piezas ─────────────────────────────────────
select lives_ok(
  $$ select public.transfer_stock(
       (select id from prod),
       'a1111111-1111-1111-1111-111111111111',
       'a2222222-2222-2222-2222-222222222222', 4) $$,
  'Se traspasan 4 piezas a la otra sucursal'
);

select is(
  (select sum(ps.quantity)::int from public.product_stock ps),
  10,
  'El total de la organización no cambia: sólo se movió de anaquel'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.branch_id = 'a2222222-2222-2222-2222-222222222222'),
  4,
  'Las piezas llegaron al destino'
);

select throws_ok(
  $$ select public.transfer_stock(
       (select id from prod),
       'a2222222-2222-2222-2222-222222222222',
       'a1111111-1111-1111-1111-111111111111', 99) $$,
  'P0001',
  NULL,
  'Un traspaso sin existencias suficientes se rechaza entero'
);

select is(
  (select sum(ps.quantity)::int from public.product_stock ps),
  10,
  'Y no deja piezas perdidas en el aire (la salida no se aplicó sola)'
);

-- ── Ajuste por conteo físico ─────────────────────────────────────────────────
-- El ajuste FIJA el saldo al conteo; el libro guarda la diferencia aplicada.
select lives_ok(
  $$ select public.register_stock_movement(
       (select id from prod), 'a1111111-1111-1111-1111-111111111111',
       'adjustment', 5, null, 'Conteo del lunes') $$,
  'Un ajuste fija el saldo al conteo físico'
);

select is(
  (select ps.quantity from public.product_stock ps
    where ps.branch_id = 'a1111111-1111-1111-1111-111111111111'),
  5,
  'El saldo queda en lo contado, no sumado'
);

-- ── Alertas de mínimo ────────────────────────────────────────────────────────
update public.product_stock set min_quantity = 6
 where branch_id = 'a1111111-1111-1111-1111-111111111111';

select is(
  (select count(*)::int from public.low_stock_products),
  1,
  'El producto por debajo de su mínimo aparece en las alertas'
);

-- ── Recepción mueve inventario, pero no edita el catálogo ────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ select public.register_stock_movement(
       (select id from prod), 'a1111111-1111-1111-1111-111111111111',
       'loss', 1, null, 'Envase roto') $$,
  'Recepción SÍ registra mermas (es quien recibe la mercancía)'
);

select throws_ok(
  $$ insert into public.products (org_id, name, price)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Producto pirata', 1) $$,
  '42501',
  NULL,
  'Recepción NO puede editar el catálogo (eso es configuración)'
);

-- ── Aislamiento entre organizaciones ─────────────────────────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::int from public.products),
  0,
  'Admin B NO ve el catálogo de la org A'
);

select * from finish();
rollback;
