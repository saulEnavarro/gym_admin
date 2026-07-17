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
select plan(28);

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

select * from finish();
rollback;
