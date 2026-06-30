-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ SEED · Datos demo para desarrollo y pruebas de aislamiento                 ║
-- ║                                                                            ║
-- ║ Crea DOS organizaciones independientes (Iron Temple / FitZone) con sus     ║
-- ║ usuarios. Sirven para verificar a mano y por test que la Org A no ve los   ║
-- ║ datos de la Org B.                                                         ║
-- ║                                                                            ║
-- ║ Credenciales demo (contraseña para todos): Password123!                    ║
-- ║   · admin@iron-temple.test      → Admin de Iron Temple                     ║
-- ║   · recepcion@iron-temple.test  → Recepcionista (sucursal Centro)          ║
-- ║   · admin@fitzone.test          → Admin de FitZone                         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Usuarios de autenticación ────────────────────────────────────────────────
-- Insertamos en auth.users (el trigger handle_new_user crea su profile).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'admin@iron-temple.test',
   extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Alicia Admin (Iron Temple)"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'recepcion@iron-temple.test',
   extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Rodrigo Recepción (Iron Temple)"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
   'admin@fitzone.test',
   extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Beatriz Admin (FitZone)"}', now(), now(), '', '', '', '');

-- Identidades de email (requeridas para login con email/password).
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
)
values
  (extensions.gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@iron-temple.test"}',
   'email', '11111111-1111-1111-1111-111111111111', now(), now(), now()),
  (extensions.gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"recepcion@iron-temple.test"}',
   'email', '22222222-2222-2222-2222-222222222222', now(), now(), now()),
  (extensions.gen_random_uuid(), '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@fitzone.test"}',
   'email', '33333333-3333-3333-3333-333333333333', now(), now(), now());

-- ── Organizaciones ───────────────────────────────────────────────────────────
-- (El trigger handle_new_organization crea su fila en org_branding.)
insert into public.organizations (id, name, slug)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Iron Temple', 'iron-temple'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'FitZone',     'fitzone');

-- ── Sucursales ───────────────────────────────────────────────────────────────
insert into public.branches (id, org_id, name, address, phone)
values
  ('a1111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Iron Temple — Centro',
   'Av. Juárez 100, Centro', '55-1000-0001'),
  ('a2222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Iron Temple — Norte',
   'Blvd. Norte 200', '55-1000-0002'),
  ('b1111111-1111-1111-1111-111111111111',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'FitZone — Roma',
   'Calle Roma 50, Col. Roma', '55-2000-0001');

-- ── Membresías de staff (usuario ↔ organización + rol) ───────────────────────
insert into public.org_members (id, org_id, user_id, role)
values
  ('d1111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', 'admin'),
  ('d2222222-2222-2222-2222-222222222222',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '22222222-2222-2222-2222-222222222222', 'receptionist'),
  ('d3333333-3333-3333-3333-333333333333',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '33333333-3333-3333-3333-333333333333', 'admin');

-- Recepción de Iron Temple sólo opera la sucursal Centro.
insert into public.member_branches (member_id, branch_id)
values
  ('d2222222-2222-2222-2222-222222222222',
   'a1111111-1111-1111-1111-111111111111');

-- ── Branding diferenciado por organización ───────────────────────────────────
update public.org_branding
   set primary_color = '#dc2626', font_family = 'Inter',
       contact_email = 'hola@iron-temple.test'
 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

update public.org_branding
   set primary_color = '#16a34a', font_family = 'Poppins',
       contact_email = 'hola@fitzone.test'
 where org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
