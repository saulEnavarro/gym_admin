-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Administración de la plataforma                                     ║
-- ║                                                                            ║
-- ║ Aquí conviven dos permisos que se parecen y NO son lo mismo: el            ║
-- ║ administrador de un gimnasio (`org_members.role = 'admin'`) y el operador  ║
-- ║ de la plataforma (`platform_admins`). Confundirlos significaría que        ║
-- ║ cualquier dueño de gimnasio puede ver a los demás y crear inquilinos.      ║
-- ║                                                                            ║
-- ║ Estas funciones son SECURITY DEFINER: corren sin RLS, así que su           ║
-- ║ autorización es código, no política. Si ese `if` se rompe, nada más lo     ║
-- ║ detiene — por eso se prueba desde los dos lados.                           ║
-- ║                                                                            ║
-- ║ La semilla deja a Alicia (Iron Temple) como operadora de la plataforma;    ║
-- ║ Álvaro (FitZone) es admin de su gimnasio y nada más. La diferencia entre   ║
-- ║ esos dos es lo que se prueba.                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(17);

set local role postgres;

-- El dueño del gimnasio que se dará de alta más abajo. En producción lo crea
-- la aplicación con la llave de servicio (así se manda la invitación) y sólo
-- después llama a provision_organization; aquí se reproduce ese orden.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated',
  'dueno@power-house.test',
  extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Pedro Dueño"}', now(), now(), '', '', '', ''
);

-- ── La tabla no se lee ni se escribe desde la aplicación ────────────────────
select is_empty(
  $$select policyname from pg_policies
     where schemaname = 'public' and tablename = 'platform_admins'$$,
  'platform_admins no expone ninguna política: sólo se toca desde el panel de Supabase'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_admins'::regclass),
  'platform_admins tiene RLS activo (sin políticas, eso la vuelve ilegible)'
);

-- ── Un admin de gimnasio NO opera la plataforma ─────────────────────────────
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
set local role authenticated;

select ok(
  not public.is_platform_admin(),
  'ser admin de un gimnasio NO te hace operador de la plataforma'
);
select throws_ok(
  $$select * from public.platform_organizations()$$,
  '42501',
  'Sólo la administración de la plataforma',
  'un admin de gimnasio no puede listar los demás gimnasios'
);
select throws_ok(
  $$select public.provision_organization(
      'Gimnasio Pirata', 'gimnasio-pirata',
      '33333333-3333-3333-3333-333333333333')$$,
  '42501',
  'Sólo la administración de la plataforma',
  'un admin de gimnasio no puede darse de alta otro gimnasio'
);
select is_empty(
  $$select user_id from public.platform_admins$$,
  'platform_admins es invisible incluso para un admin de gimnasio'
);

-- ── El operador de la plataforma ────────────────────────────────────────────
set local role postgres;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
set local role authenticated;

select ok(public.is_platform_admin(), 'el operador de la plataforma se reconoce');

select is(
  (select count(*) from public.platform_organizations()),
  2::bigint,
  've los dos gimnasios de la semilla, no sólo el suyo'
);
select is(
  (select branches from public.platform_organizations() where slug = 'iron-temple'),
  2,
  'los conteos son reales: Iron Temple tiene dos sucursales'
);

-- El panel muestra conteos, nunca datos. Que la función no devuelva de quién
-- son las ventas ni quiénes son los socios es justamente el punto.
select bag_eq(
  $$select unnest(p.proargnames)::text from pg_proc p
     where p.proname = 'platform_organizations'
       and p.pronamespace = 'public'::regnamespace$$,
  $$values ('id'),('name'),('slug'),('is_active'),('created_at'),
           ('branches'),('staff'),('clients'),('sales_30d')$$,
  'el panel sólo devuelve identidad y conteos, ningún dato del gimnasio'
);

-- ── Alta de un gimnasio ─────────────────────────────────────────────────────
select throws_ok(
  $$select public.provision_organization(
      'Con Espacios', 'Con Espacios',
      '44444444-4444-4444-4444-444444444444')$$,
  '22023',
  'El identificador sólo admite minúsculas, números y guiones',
  'rechaza un identificador que no sirve para una URL'
);
select throws_ok(
  $$select public.provision_organization(
      'Otro Iron Temple', 'iron-temple',
      '44444444-4444-4444-4444-444444444444')$$,
  'P0001',
  'Ya existe un gimnasio con ese identificador',
  'rechaza un identificador repetido antes de crear nada'
);

create temporary table nuevo as
select public.provision_organization(
  'Power House', 'power-house',
  '44444444-4444-4444-4444-444444444444') as org;

-- Lo que se creó se revisa sin RLS: el operador de la plataforma no es miembro
-- del gimnasio nuevo, así que desde su sesión no vería ninguna de estas filas
-- (eso se comprueba al final, que es justo lo que debe pasar).
set local role postgres;

select isnt_empty(
  $$select 1 from public.branches b, nuevo n where b.org_id = n.org$$,
  'el gimnasio nace con una sucursal: sin ella no se podría abrir turno de caja'
);
select is(
  (select b.timezone from public.org_branding b, nuevo n where b.org_id = n.org),
  'America/Mexico_City',
  'el branding queda con la zona horaria pedida'
);
select is(
  (select m.role::text from public.org_members m, nuevo n where m.org_id = n.org),
  'admin',
  'el dueño queda como administrador de su gimnasio'
);
select is(
  (select count(*) from public.product_categories c, nuevo n where c.org_id = n.org),
  8::bigint,
  'las categorías de producto se crean solas con la organización'
);

-- Y crear un gimnasio no te vuelve miembro de él: el operador de la plataforma
-- sigue sin ver por dentro lo que acaba de dar de alta.
set local role authenticated;

select is_empty(
  $$select b.id from public.branches b, nuevo n where b.org_id = n.org$$,
  'dar de alta un gimnasio no da acceso a sus datos: la RLS lo sigue ocultando'
);

select * from finish();
rollback;
