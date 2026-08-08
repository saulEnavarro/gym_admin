-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Portal del cliente (RLS auto-acotada + rate-limiting)               ║
-- ║                                                                            ║
-- ║ Verifica que un cliente del portal (vinculado a UNA ficha, NO org_member)  ║
-- ║ sólo lee SUS datos y jamás los de otro cliente ni otra org (barandilla #1  ║
-- ║ y #4). Se ejecuta con: `supabase test db`.                                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(13);

-- ── Fixtures (como superusuario, bypasseando RLS) ────────────────────────────
set local role postgres;

-- Cuenta de portal para Juan (Iron Temple). El trigger handle_new_user crea su
-- profile con account_type='client' a partir del metadato.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated',
  'juan.perez@example.test',
  extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"account_type":"client","full_name":"Juan Pérez López"}', now(), now(),
  '', '', '', ''
);

-- Vincula la ficha de Juan a esa cuenta.
update public.clients
   set user_id = '99999999-9999-9999-9999-999999999999',
       portal_invited_at = now()
 where email = 'juan.perez@example.test';

-- Membresías: una para Juan y una para Ana (misma org).
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date)
select org_id, id, 'Mensual', current_date - 5, current_date + 25
  from public.clients where email = 'juan.perez@example.test';
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date)
select org_id, id, 'Mensual', current_date - 5, current_date + 25
  from public.clients where email = 'ana.garcia@example.test';

-- Turno de caja (las ventas exigen cash_session_id desde la migración 0014).
insert into public.cash_sessions (id, org_id, opened_by, opening_float)
values (
  'c5555555-5555-5555-5555-555555555555',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111', 0
);

-- Una venta para Juan y una para Ana.
insert into public.sales (org_id, folio, client_id, cash_session_id, subtotal, total, payment_method)
select org_id, 9001, id, 'c5555555-5555-5555-5555-555555555555', 450, 522, 'cash'
  from public.clients where email = 'juan.perez@example.test';
insert into public.sales (org_id, folio, client_id, cash_session_id, subtotal, total, payment_method)
select org_id, 9002, id, 'c5555555-5555-5555-5555-555555555555', 450, 522, 'cash'
  from public.clients where email = 'ana.garcia@example.test';

-- ── Sesión: cliente del portal (Juan) ────────────────────────────────────────
set local request.jwt.claims to '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
set local role authenticated;

select ok(
  public.current_client_id() is not null,
  'El portal resuelve la ficha vinculada del cliente (current_client_id)'
);

select is(
  (select count(*)::int from clients),
  1,
  'El cliente del portal ve EXACTAMENTE su propia ficha (1)'
);

select is(
  (select email::text from clients),
  'juan.perez@example.test',
  'Y esa ficha es la suya'
);

select is_empty(
  $$ select 1 from clients where email = 'ana.garcia@example.test' $$,
  'NO puede ver la ficha de otro cliente de su misma org'
);

select is(
  (select count(*)::int from client_memberships),
  1,
  'Ve sólo SU membresía (1), no la de Ana'
);

select is_empty(
  $$ select 1 from client_memberships cm
     join clients c on c.id = cm.client_id
     where c.email = 'ana.garcia@example.test' $$,
  'NO puede ver la membresía de otro cliente'
);

select is(
  (select count(*)::int from sales),
  1,
  'Ve sólo SU venta (1)'
);

select is(
  (select folio::int from sales),
  9001,
  'Y es su propia venta (folio 9001)'
);

select is(
  (select count(*)::int from organizations),
  1,
  'Ve sólo su organización (Iron Temple)'
);

select is_empty(
  $$ select 1 from organizations where slug = 'fitzone' $$,
  'NO puede ver otra organización (aislamiento entre inquilinos)'
);

select throws_ok(
  $$ insert into clients (org_id, first_name, last_name)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pirata', 'Cliente') $$,
  '42501',
  NULL,
  'El cliente del portal NO puede escribir en clients (no es staff)'
);

-- ── Rate-limiting del login (barandilla #4) ──────────────────────────────────
set local role postgres;

insert into public.portal_login_attempts (email, ip, ok)
select 'bruto@example.test', '10.0.0.9', false from generate_series(1, 5);

-- El detalle del retraso progresivo vive en 05_portal_login_throttle; aquí sólo
-- se comprueba que la barandilla está puesta en la superficie del portal.
select ok(
  public.login_retry_delay('bruto@example.test', '10.0.0.9') > 0,
  '5 intentos fallidos imponen una espera antes del siguiente intento'
);

select is(
  public.login_retry_delay('nuevo@example.test', '10.0.0.1'),
  0,
  'Un email/ip sin intentos fallidos no espera nada'
);

select * from finish();
rollback;
