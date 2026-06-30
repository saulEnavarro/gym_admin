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
select plan(15);

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

select * from finish();
rollback;
