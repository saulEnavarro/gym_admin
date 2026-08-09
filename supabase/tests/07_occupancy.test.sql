-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Ocupación (aforo, hora pico, semana típica)                         ║
-- ║                                                                            ║
-- ║ Lo que hay que demostrar aquí es que se mide gente DENTRO y no llegadas:   ║
-- ║ una visita larga tiene que contar en todas las horas que cubrió, incluidas ║
-- ║ aquellas en las que no entró nadie nuevo. Eso es lo que llena un gimnasio. ║
-- ║ Y, como siempre, que los agregados no cruzan inquilinos.                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(14);

set local role postgres;

create temporary table hoy as
  select (now() at time zone 'America/Mexico_City')::date as d;
grant select on hoy to authenticated;

update public.branches set capacity = 50
 where id = 'a1111111-1111-1111-1111-111111111111';

-- Ayer: dos socios de 18:00 a 20:30 (cubren las horas 18, 19 y 20).
insert into public.access_logs
  (org_id, branch_id, client_id, method, entered_at, exited_at, exit_method)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       'a1111111-1111-1111-1111-111111111111',
       c.id, 'qr',
       (((select d from hoy) - 1)::timestamp + interval '18 hours')
         at time zone 'America/Mexico_City',
       (((select d from hoy) - 1)::timestamp + interval '20 hours 30 minutes')
         at time zone 'America/Mexico_City',
       'qr'
from (select id from public.clients
       where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 2) c;

-- Dos socios dentro AHORA (sin salida registrada).
insert into public.access_logs (org_id, branch_id, client_id, method, entered_at)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       'a1111111-1111-1111-1111-111111111111',
       id, 'qr', now() - interval '15 minutes'
from public.clients
where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 2;

-- ── Sesión: Admin de Iron Temple ─────────────────────────────────────────────
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select is(
  (select o.inside from public.occupancy_now() o),
  2,
  'El aforo actual cuenta sólo a quien no ha salido'
);

select is(
  (select o.capacity from public.occupancy_now() o),
  50,
  'Toma la capacidad declarada de la sucursal'
);

select is(
  (select o.pct from public.occupancy_now() o),
  4.0::numeric,
  'El porcentaje de aforo es 2 de 50'
);

-- ── Ocupación por hora: la clave del diseño ──────────────────────────────────
select is(
  (select h.entries from hoy, lateral public.occupancy_by_hour(d - 2, d) h
    where h.hour = 20),
  0,
  'A las 20:00 no entró nadie nuevo'
);

select ok(
  (select h.avg_inside from hoy, lateral public.occupancy_by_hour(d - 2, d) h
    where h.hour = 20) > 0,
  '…pero SÍ había gente dentro: se mide ocupación, no llegadas'
);

select is(
  (select h.entries from hoy, lateral public.occupancy_by_hour(d - 2, d) h
    where h.hour = 18),
  2,
  'Las dos entradas de las 18:00 se cuentan como llegadas'
);

select is(
  (select count(*)::int from hoy, lateral public.occupancy_by_hour(d - 2, d)),
  24,
  'La serie devuelve el día completo, con horas en cero incluidas'
);

-- ── Resumen ──────────────────────────────────────────────────────────────────
select is(
  (select s.visits from hoy, lateral public.access_summary(d - 2, d) s),
  4,
  'El resumen cuenta las 4 visitas del periodo'
);

select is(
  (select s.avg_minutes from hoy, lateral public.access_summary(d - 2, d) s),
  150,
  'La permanencia media usa sólo las salidas reales (2 h 30 min)'
);

-- ── Semana típica ────────────────────────────────────────────────────────────
select ok(
  (select count(*)::int from hoy, lateral public.occupancy_by_weekday_hour(d - 2, d)) > 0,
  'La semana típica devuelve celdas con ocupación'
);

-- ── El socio del portal ve el CONTEO, no a las personas ──────────────────────
-- Su RLS sobre access_logs es «sólo mis accesos»: si las funciones agregaran
-- bajo esa RLS, el «¿qué tan lleno está?» le diría 1 habiendo 3.
set local role postgres;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
values (
  '00000000-0000-0000-0000-000000000000',
  '99999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated',
  'portal.ocupacion@example.test',
  extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"account_type":"client"}', now(), now(), '', '', '', '');

update public.clients
   set user_id = '99999999-9999-9999-9999-999999999999'
 where email = 'juan.perez@example.test';

set local request.jwt.claims to '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';
set local role authenticated;

select is(
  (select o.inside from public.occupancy_now() o),
  2,
  'El socio ve cuánta gente hay de verdad, no sólo sus propios accesos'
);

select is(
  (select o.capacity from public.occupancy_now() o),
  50,
  'El socio ve el aforo aunque no pueda leer la tabla de sucursales'
);

select is(
  (select count(*)::int from public.access_logs),
  0,
  'Pero sigue sin poder ver los accesos: el conteo no le abre la bitácora'
);

-- ── Aislamiento entre organizaciones ─────────────────────────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select is(
  (select o.inside from public.occupancy_now() o),
  0,
  'Admin B NO ve a nadie dentro del gimnasio de la org A'
);

select * from finish();
rollback;
