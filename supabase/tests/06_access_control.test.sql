-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Control de acceso (check_in / check_out)                            ║
-- ║                                                                            ║
-- ║ La puerta es la superficie más sensible después del dinero: aquí se        ║
-- ║ comprueba que sólo entra quien debe, que un segundo escaneo no infla la    ║
-- ║ ocupación, que la autorización de una vencida deja rastro de quién la dio, ║
-- ║ y —lo más importante— que el QR de un socio de otra organización NO abre    ║
-- ║ esta puerta.                                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(19);

-- ── Fixtures ─────────────────────────────────────────────────────────────────
set local role postgres;

-- Juan (Iron Temple): membresía vigente.
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date, status)
select org_id, id, 'Mensual', current_date - 10, current_date + 20, 'active'
  from public.clients where email = 'juan.perez@example.test';

-- Ana (Iron Temple): membresía VENCIDA hace 5 días.
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date, status)
select org_id, id, 'Mensual', current_date - 40, current_date - 5, 'active'
  from public.clients where email = 'ana.garcia@example.test';

-- Sofía (FitZone, otra organización): membresía vigente y su propio QR.
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date, status)
select org_id, id, 'Mensual Premium', current_date - 10, current_date + 20, 'active'
  from public.clients where email = 'sofia.ramirez@example.test';

create temporary table tok as
select
  (select public.issue_access_token(id) from public.clients where email = 'juan.perez@example.test')  as juan,
  (select public.issue_access_token(id) from public.clients where email = 'ana.garcia@example.test')  as ana,
  (select public.issue_access_token(id) from public.clients where email = 'sofia.ramirez@example.test') as sofia,
  (select public.issue_access_token(id) from public.clients where email = 'carlos.mendez@example.test') as carlos;
grant select on tok to authenticated;

-- ── Sesión: Recepción de Iron Temple ─────────────────────────────────────────
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
set local role authenticated;

select is(
  (select public.check_in(p_token => t.juan) ->> 'status' from tok t),
  'granted',
  'Socio con membresía vigente entra con su QR'
);

select is(
  (select count(*)::int from public.access_logs),
  1,
  'La entrada queda registrada en la bitácora'
);

select is(
  (select public.check_in(p_token => t.juan) ->> 'status' from tok t),
  'already_inside',
  'Un segundo escaneo NO duplica la visita (no infla la ocupación)'
);

select is(
  (select public.check_out(p_token => t.juan) ->> 'status' from tok t),
  'checked_out',
  'La salida cierra la visita'
);

select is(
  (select a.exit_method from public.access_logs a),
  'qr',
  'La salida por escaneo se marca como real, no estimada'
);

select is(
  (select public.check_out(p_token => t.juan) ->> 'status' from tok t),
  'not_inside',
  'Salir dos veces no rompe nada'
);

-- ── Membresía vencida ────────────────────────────────────────────────────────
select is(
  (select public.check_in(p_token => t.ana) ->> 'reason' from tok t),
  'expired_membership',
  'Membresía vencida NO entra por su cuenta'
);

select is(
  (select count(*)::int from public.access_logs a
     join public.clients c on c.id = a.client_id
    where c.email = 'ana.garcia@example.test'),
  0,
  'Un acceso denegado no deja entrada en la bitácora'
);

select is(
  (select public.check_in(p_token => t.ana, p_override_reason => 'Renueva al salir') ->> 'status'
     from tok t),
  'authorized',
  'Recepción SÍ puede autorizar el paso de una vencida'
);

select is(
  (select a.override_reason from public.access_logs a
     join public.clients c on c.id = a.client_id
    where c.email = 'ana.garcia@example.test'),
  'Renueva al salir',
  'La autorización guarda el motivo'
);

select is(
  (select a.authorized_by from public.access_logs a
     join public.clients c on c.id = a.client_id
    where c.email = 'ana.garcia@example.test'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'La autorización guarda QUIÉN la dio (rastro para auditar)'
);

-- ── Credencial ───────────────────────────────────────────────────────────────
select is(
  public.check_in(p_token => 'token-inventado') ->> 'reason',
  'invalid_token',
  'Un QR inventado no abre'
);

select is(
  (select public.check_in(p_token => t.carlos) ->> 'reason' from tok t),
  'inactive_client',
  'Un socio dado de baja no entra aunque tenga QR'
);

-- Rotar el token invalida la captura de pantalla anterior.
create temporary table tok2 as
  select public.issue_access_token(id) as juan
    from public.clients where email = 'juan.perez@example.test';

select is(
  (select public.check_in(p_token => t.juan) ->> 'reason' from tok t),
  'invalid_token',
  'Al rotar el QR, el anterior deja de servir (revocación)'
);

select is(
  (select public.check_in(p_token => t2.juan) ->> 'status' from tok2 t2),
  'granted',
  'El QR nuevo sí entra'
);

-- ── Aislamiento entre organizaciones ─────────────────────────────────────────
-- El QR de una socia de FitZone no debe abrir la puerta de Iron Temple: la RLS
-- esconde su ficha, así que el token ni siquiera se resuelve.
select is(
  (select public.check_in(p_token => t.sofia) ->> 'reason' from tok t),
  'invalid_token',
  'El QR de un socio de OTRA organización no abre esta puerta'
);

-- ── El socio del portal rota SU QR, pero no escala privilegios ───────────────
-- issue_access_token es SECURITY DEFINER con la autorización comprobada dentro,
-- justamente para NO tener que darle al socio un UPDATE sobre `clients`: esa
-- política le habría abierto todas las columnas de su fila (is_active, org_id…).
set local role postgres;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '77777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated',
  'portal.juan@example.test',
  extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"account_type":"client","full_name":"Juan Pérez López"}', now(), now(),
  '', '', '', ''
);

update public.clients
   set user_id = '77777777-7777-7777-7777-777777777777'
 where email = 'juan.perez@example.test';

-- Los ids se capturan AQUÍ (como postgres) porque el socio del portal no puede
-- ni resolver la ficha de otro socio: la RLS se la esconde. Si la subconsulta
-- corriera con su sesión llegaría NULL a la función y probaríamos otra cosa.
create temporary table ids as
select
  (select id from public.clients where email = 'juan.perez@example.test') as juan,
  (select id from public.clients where email = 'ana.garcia@example.test') as ana;
grant select on ids to authenticated;

set local request.jwt.claims to '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ select public.issue_access_token((select juan from ids)) $$,
  'El socio del portal SÍ puede rotar su propio QR'
);

select throws_ok(
  $$ select public.issue_access_token((select ana from ids)) $$,
  '42501',
  NULL,
  'El socio del portal NO puede emitir el QR de otro socio'
);

-- La escalada que la política de UPDATE habría permitido: reactivarse tras una
-- baja o mudar la ficha de organización. Sin esa política, la RLS lo filtra y
-- el UPDATE no toca ninguna fila.
update public.clients
   set is_active = true, org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
 where id = public.current_client_id();

select is(
  (select c.org_id from public.clients c where c.email = 'juan.perez@example.test'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'El socio del portal NO puede mudar su ficha a otra organización'
);

select * from finish();
rollback;
