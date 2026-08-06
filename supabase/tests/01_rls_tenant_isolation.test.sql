-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Aislamiento entre inquilinos (RLS)                                  ║
-- ║                                                                            ║
-- ║ Verifica la barandilla #1 (§2 y §5.1): la organización A NO puede leer ni  ║
-- ║ escribir datos de la organización B. Se ejecuta con: `supabase test db`.   ║
-- ║                                                                            ║
-- ║ Simula sesiones autenticadas fijando el claim JWT `sub` y el rol           ║
-- ║ `authenticated`, igual que haría Supabase con un usuario real.             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(57);

-- IDs del seed.
-- Org A = Iron Temple (aaaa…), Org B = FitZone (bbbb…)
-- Admin A = 1111…, Recepción A = 2222…, Admin B = 3333…

-- ── Sesión: Admin A ──────────────────────────────────────────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::int from organizations),
  1,
  'Admin A ve exactamente 1 organización (la suya)'
);

select is_empty(
  $$ select 1 from organizations where slug = 'fitzone' $$,
  'Admin A NO puede ver la organización FitZone (org B)'
);

select is(
  (select count(*)::int from branches),
  2,
  'Admin A ve las 2 sucursales de su organización (ninguna de la org B)'
);

select is(
  (select count(*)::int from org_members),
  2,
  'Admin A ve los 2 miembros de su organización (ninguno de la org B)'
);

select is(
  (select count(*)::int from org_branding),
  1,
  'Admin A ve sólo el branding de su organización'
);

select is_empty(
  $$ select 1 from org_branding where org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'Admin A NO puede ver el branding de la org B'
);

select isnt_empty(
  $$ select 1 from audit_logs $$,
  'Admin A (rol admin) SÍ puede leer los logs de auditoría de su org'
);

select is(
  (select count(*)::int from current_user_branch_ids()),
  2,
  'Admin A puede operar las 2 sucursales de su org'
);

select throws_ok(
  $$ insert into branches (org_id, name)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Sucursal pirata') $$,
  '42501',
  NULL,
  'Admin A NO puede crear una sucursal en la org B (cross-tenant bloqueado)'
);

select lives_ok(
  $$ insert into branches (org_id, name)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sucursal nueva (test)') $$,
  'Admin A SÍ puede crear una sucursal en su propia org'
);

-- Clientes (Fase 1): aislamiento de la tabla clients.
select is(
  (select count(*)::int from clients),
  3,
  'Admin A ve los 3 clientes de su organización (ninguno de la org B)'
);

select is_empty(
  $$ select 1 from clients where email = 'sofia.ramirez@example.test' $$,
  'Admin A NO puede ver un cliente de la org B'
);

select throws_ok(
  $$ insert into clients (org_id, first_name, last_name)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cliente', 'Pirata') $$,
  '42501',
  NULL,
  'Admin A NO puede crear un cliente en la org B (cross-tenant bloqueado)'
);

select lives_ok(
  $$ insert into clients (org_id, first_name, last_name)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nuevo', 'Cliente (test)') $$,
  'Admin A SÍ puede registrar un cliente en su propia org'
);

-- Membresías (Fase 1): aislamiento del catálogo de planes.
select is(
  (select count(*)::int from membership_plans),
  6,
  'Admin A ve las 6 membresías de su organización (ninguna de la org B)'
);

select is_empty(
  $$ select 1 from membership_plans where name = 'Mensual Premium' $$,
  'Admin A NO puede ver una membresía de la org B'
);

select throws_ok(
  $$ insert into membership_plans (org_id, name, price)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Plan pirata', 1) $$,
  '42501',
  NULL,
  'Admin A NO puede crear una membresía en la org B (cross-tenant bloqueado)'
);

-- Caja (Fase 1): sin turno abierto no se puede vender.
select throws_ok(
  $$ select public.create_membership_sale(
       (select id from clients where first_name = 'Juan' limit 1),
       null,
       (select id from membership_plans where name = 'Mensual' limit 1),
       'cash', 'none', 0, null) $$,
  'P0001',
  NULL,
  'Sin turno de caja abierto NO se puede registrar una venta'
);

select lives_ok(
  $$ select public.open_cash_session(
       'a1111111-1111-1111-1111-111111111111', 500, 'Apertura de prueba') $$,
  'Admin A abre su turno de caja con $500 de fondo inicial'
);

select ok(
  public.current_cash_session() is not null,
  'current_cash_session() devuelve el turno abierto del cajero'
);

select throws_ok(
  $$ select public.open_cash_session(
       'a1111111-1111-1111-1111-111111111111', 100, null) $$,
  'P0001',
  NULL,
  'Un cajero NO puede tener dos turnos abiertos a la vez'
);

-- POS (Fase 1): venta de membresía atómica + regla de apilado.
select lives_ok(
  $$ select public.create_membership_sale(
       (select id from clients where first_name = 'Juan' limit 1),
       null,
       (select id from membership_plans where name = 'Mensual' limit 1),
       'cash', 'none', 0, null) $$,
  'Admin A registra una venta de membresía (Mensual, individual)'
);

select is(
  (select count(*)::int from sales),
  1,
  'La venta quedó registrada en la org A'
);

select is(
  (select count(*)::int from client_memberships),
  1,
  'La venta otorgó exactamente una membresía'
);

-- Apilado: tras la venta, el siguiente inicio = vencimiento vigente + 1.
select is(
  public.next_membership_start(
    (select id from clients where first_name = 'Juan' limit 1),
    current_date),
  (select max(cm.end_date) + 1
     from client_memberships cm
     join clients c on c.id = cm.client_id
     where c.first_name = 'Juan'),
  'Renovación anticipada apila sobre el vencimiento vigente'
);

-- Arqueo: fondo 500 + venta en efectivo (450 + 16% IVA = 522) = 1022 esperados.
select is(
  (select t.expected_cash from cash_session_totals t
    where t.cash_session_id = public.current_cash_session()),
  1022.00::numeric,
  'El efectivo esperado suma el fondo inicial y la venta en efectivo'
);

select lives_ok(
  $$ select public.register_cash_movement(
       'expense', 'supplier', 100, 'cash', 'Compra de garrafones') $$,
  'Admin A registra un egreso en efectivo del turno'
);

select is(
  (select t.expected_cash from cash_session_totals t
    where t.cash_session_id = public.current_cash_session()),
  922.00::numeric,
  'El egreso en efectivo baja el esperado en caja'
);

-- Cancelar la venta genera automáticamente el egreso del reembolso (§7 · POS).
select lives_ok(
  $$ select public.cancel_sale(
       (select id from sales where status = 'completed' limit 1),
       'Cobro equivocado') $$,
  'Admin A cancela la venta y se registra el reembolso en caja'
);

select is(
  (select count(*)::int from cash_movements),
  2,
  'El turno acumula 2 movimientos (egreso manual + reembolso)'
);

-- La venta cancelada entró y salió del cajón: neta cero. Queda 500 − 100 = 400.
select is(
  (select t.expected_cash from cash_session_totals t
    where t.cash_session_id = public.current_cash_session()),
  400.00::numeric,
  'El reembolso no descuenta dos veces: la venta cancelada neta cero'
);

-- ── Sesión: Recepción A (no admin) ───────────────────────────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::int from current_user_branch_ids()),
  1,
  'Recepción A sólo opera su sucursal asignada (Centro)'
);

select is_empty(
  $$ select 1 from audit_logs $$,
  'Recepción A (no admin) NO puede leer los logs de auditoría'
);

select throws_ok(
  $$ insert into branches (org_id, name)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sucursal sin permiso') $$,
  '42501',
  NULL,
  'Recepción A (no admin) NO puede crear sucursales'
);

-- Recepción SÍ puede registrar clientes (operación de mostrador)…
select lives_ok(
  $$ insert into clients (org_id, first_name, last_name)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Recep', 'Alta') $$,
  'Recepción A SÍ puede registrar clientes en su org'
);

-- …pero NO puede borrarlos: la política de DELETE (admin/manager) filtra la fila,
-- así que el borrado es un no-op y el cliente permanece.
delete from clients where first_name = 'Recep';
select isnt_empty(
  $$ select 1 from clients where first_name = 'Recep' $$,
  'Recepción A NO puede borrar clientes (RLS filtra el DELETE)'
);

-- Recepción LEE el catálogo (lo necesita para el POS)…
select is(
  (select count(*)::int from membership_plans),
  6,
  'Recepción A SÍ puede leer las 6 membresías de su org (para vender)'
);

-- …pero NO puede editar el catálogo (gestión de admin/gerente).
select throws_ok(
  $$ insert into membership_plans (org_id, name, price)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Plan sin permiso', 1) $$,
  '42501',
  NULL,
  'Recepción A (no admin/gerente) NO puede crear membresías'
);

-- El turno de Admin A no le sirve a Recepción: cada cajero abre el suyo.
select throws_ok(
  $$ select public.create_membership_sale(
       (select id from clients where first_name = 'Ana' limit 1),
       null,
       (select id from membership_plans where name = 'Semanal' limit 1),
       'card', 'none', 0, null) $$,
  'P0001',
  NULL,
  'Recepción A NO hereda el turno de otro cajero para vender'
);

select throws_ok(
  $$ select public.open_cash_session(
       'a2222222-2222-2222-2222-222222222222', 200, null) $$,
  '42501',
  NULL,
  'Recepción A NO puede abrir turno en una sucursal que no opera'
);

select lives_ok(
  $$ select public.open_cash_session(
       'a1111111-1111-1111-1111-111111111111', 200, null) $$,
  'Recepción A abre su turno en la sucursal que sí opera (Centro)'
);

-- Recepción SÍ puede vender (operación de mostrador).
select lives_ok(
  $$ select public.create_membership_sale(
       (select id from clients where first_name = 'Ana' limit 1),
       null,
       (select id from membership_plans where name = 'Semanal' limit 1),
       'card', 'none', 0, null) $$,
  'Recepción A SÍ puede registrar una venta de membresía'
);

select is(
  (select count(*)::int from sales),
  2,
  'La org A acumula 2 ventas (admin + recepción)'
);

-- El arqueo es de cada quien: una venta con tarjeta no toca el cajón.
select is(
  (select t.expected_cash from cash_session_totals t
    where t.cash_session_id = public.current_cash_session()),
  200.00::numeric,
  'Una venta con tarjeta no altera el efectivo esperado del turno'
);

select throws_ok(
  $$ select public.close_cash_session(
       (select id from cash_sessions
         where opened_by = '11111111-1111-1111-1111-111111111111'),
       0, null) $$,
  '42501',
  NULL,
  'Recepción A NO puede cerrar el turno de otro cajero'
);

-- ── Sesión: Admin A de nuevo — cierre de turno y arqueo ──────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ select public.close_cash_session(
       (select id from cash_sessions
         where opened_by = '11111111-1111-1111-1111-111111111111'),
       380, 'Faltó dinero en el cajón') $$,
  'Admin A cierra su turno capturando el efectivo contado'
);

select is(
  (select cs.difference from cash_sessions cs
    where cs.opened_by = '11111111-1111-1111-1111-111111111111'),
  -20.00::numeric,
  'El arqueo detecta el faltante: contado 380 − esperado 400 = −20'
);

select ok(
  public.current_cash_session() is null,
  'Cerrado el turno, el cajero ya no tiene turno abierto'
);

select throws_ok(
  $$ select public.create_membership_sale(
       (select id from clients where first_name = 'Juan' limit 1),
       null,
       (select id from membership_plans where name = 'Visita' limit 1),
       'cash', 'none', 0, null) $$,
  'P0001',
  NULL,
  'Con el turno cerrado ya no se pueden registrar ventas'
);

-- ── Sesión: Admin B ──────────────────────────────────────────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*)::int from organizations),
  1,
  'Admin B ve exactamente 1 organización (la suya)'
);

select is_empty(
  $$ select 1 from organizations where slug = 'iron-temple' $$,
  'Admin B NO puede ver la organización Iron Temple (org A)'
);

select is(
  (select count(*)::int from clients),
  1,
  'Admin B ve sólo su único cliente (ninguno de la org A)'
);

select is(
  (select count(*)::int from membership_plans),
  2,
  'Admin B ve sólo sus 2 membresías (ninguna de la org A)'
);

select is(
  (select count(*)::int from sales),
  0,
  'Admin B NO ve ninguna venta de la org A'
);

select is(
  (select count(*)::int from client_memberships),
  0,
  'Admin B NO ve ninguna membresía otorgada de la org A'
);

select is(
  (select count(*)::int from cash_sessions),
  0,
  'Admin B NO ve ningún turno de caja de la org A'
);

select is(
  (select count(*)::int from cash_movements),
  0,
  'Admin B NO ve ningún movimiento de caja de la org A'
);

select * from finish();
rollback;
