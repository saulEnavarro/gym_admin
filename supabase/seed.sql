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

-- ── Clientes demo (Fase 1) ───────────────────────────────────────────────────
-- El trigger assign_client_number asigna member_number consecutivo por org.
-- Iron Temple tendrá #0001..#0003; FitZone su propio #0001 (aislamiento).
insert into public.clients (
  org_id, branch_id, first_name, last_name, birth_date, sex,
  mobile_phone, email, emergency_contact_name, emergency_contact_phone,
  data_consent_at, is_active
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'a1111111-1111-1111-1111-111111111111',
   'Juan', 'Pérez López', '1995-04-12', 'male',
   '55-3000-0001', 'juan.perez@example.test',
   'María López', '55-3000-0002', now(), true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'a1111111-1111-1111-1111-111111111111',
   'Ana', 'García Ruiz', '2000-09-30', 'female',
   '55-3000-0003', 'ana.garcia@example.test',
   'Luis García', '55-3000-0004', now(), true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'a2222222-2222-2222-2222-222222222222',
   'Carlos', 'Méndez Soto', '1988-01-05', 'male',
   '55-3000-0005', 'carlos.mendez@example.test',
   'Rosa Soto', '55-3000-0006', now(), false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'b1111111-1111-1111-1111-111111111111',
   'Sofía', 'Ramírez Díaz', '1999-07-21', 'female',
   '55-4000-0001', 'sofia.ramirez@example.test',
   'Elena Díaz', '55-4000-0002', now(), true);

-- ── Catálogo de membresías (Fase 1) ──────────────────────────────────────────
-- Precios BASE SIN IVA (§7). Iron Temple usa las 6 del prompt original.
insert into public.membership_plans
  (org_id, name, description, price, duration_days, max_members, sort_order)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mensual',     'Acceso por 30 días',        450, 30, 1, 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Parejas',     'Precio por persona, 2 pers.', 400, 30, 2, 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Estudiantes', 'Tarifa para estudiantes',   300, 30, 1, 3),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Quincenal',   'Acceso por 15 días',        250, 15, 1, 4),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Semanal',     'Acceso por 7 días',         150,  7, 1, 5),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Visita',      'Una sola visita',            50,  1, 1, 6);

-- FitZone: catálogo distinto (evidencia el aislamiento entre inquilinos).
insert into public.membership_plans
  (org_id, name, description, price, duration_days, max_members, sort_order)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mensual Premium', 'Acceso total 30 días', 600, 30, 1, 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Día',             'Pase de un día',        80,  1, 1, 2);

-- ── Fase 2 · Rebanada C · Recordatorios ──────────────────────────────────────
-- Runtime del worker (LOCAL). Producción sustituye esta fila fuera de banda.
-- El invoke_secret DEBE coincidir con REMINDER_INVOKE_SECRET del function .env.
insert into private.reminder_runtime (function_url, invoke_secret)
values (
  'http://host.docker.internal:54321/functions/v1/process-reminders',
  'local-dev-reminder-secret'
);

-- NB: no se siembran membresías aquí a propósito (los tests de RLS cuentan
-- client_memberships). Para probar recordatorios, crea una membresía por vencer
-- desde el POS o vía un INSERT puntual y llama a enqueue_due_reminders().
