-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0029 · Fase 5 · Administración de la plataforma (super admin)             ║
-- ║                                                                            ║
-- ║ DOS EJES DISTINTOS. `app_role.admin` es el administrador DE UN GIMNASIO.  ║
-- ║ Esto es otra cosa: quien opera la plataforma y da de alta gimnasios. No se ║
-- ║ mezclan ni se heredan.                                                     ║
-- ║                                                                            ║
-- ║ POR QUÉ NO SE TOCA NINGUNA POLÍTICA EXISTENTE. La tentación es agregar     ║
-- ║ «…o si es super admin» a cada política de RLS para que vea todo. Sería un  ║
-- ║ error: le pondría una puerta trasera a CADA una de las políticas que hoy   ║
-- ║ garantizan el aislamiento entre inquilinos, y un error en esa única        ║
-- ║ función filtraría todos los gimnasios a la vez.                            ║
-- ║                                                                            ║
-- ║ En cambio, el super admin necesita hacer UNA sola cosa: crear un gimnasio  ║
-- ║ con su primer administrador. Eso vive en una superficie aparte que usa la  ║
-- ║ service role, y las políticas de los inquilinos siguen intactas — con sus  ║
-- ║ pruebas significando exactamente lo mismo que antes.                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'Quienes operan la PLATAFORMA (no un gimnasio). Sólo dan de alta inquilinos.';

-- Sin políticas a propósito: nadie la lee ni la escribe por la API. Sólo la
-- consulta el helper de abajo (SECURITY DEFINER) y la service role.
alter table public.platform_admins enable row level security;

/**
 * ¿El usuario actual opera la plataforma?
 *
 * Se expone a `authenticated` porque sólo revela un booleano SOBRE UNO MISMO;
 * es lo que necesitan el middleware y el layout para decidir si muestran el
 * panel de plataforma.
 */
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_platform_admin() from public, anon;
grant  execute on function public.is_platform_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Resumen de inquilinos para el panel de plataforma.
--   Deliberadamente sólo CONTEOS: el operador ve que el gimnasio existe y qué
--   tan usado está, sin leer un solo cliente, venta ni acceso. Si algún día
--   hace falta más para dar soporte, que sea una acción explícita y auditada.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.platform_organizations()
returns table (
  id           uuid,
  name         text,
  slug         text,
  is_active    boolean,
  created_at   timestamptz,
  branches     integer,
  staff        integer,
  clients      integer,
  sales_30d    integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Sólo la administración de la plataforma' using errcode = '42501';
  end if;

  return query
  -- `slug` es citext en la tabla: sin el cast, Postgres rechaza toda la
  -- consulta con «structure of query does not match function result type».
  select o.id, o.name, o.slug::text, o.is_active, o.created_at,
         (select count(*)::integer from public.branches b where b.org_id = o.id),
         (select count(*)::integer from public.org_members m
           where m.org_id = o.id and m.role <> 'client' and m.is_active),
         (select count(*)::integer from public.clients c where c.org_id = o.id),
         (select count(*)::integer from public.sales s
           where s.org_id = o.id and s.sold_at > now() - interval '30 days')
  from public.organizations o
  order by o.created_at desc;
end;
$$;

revoke execute on function public.platform_organizations() from public, anon;
grant  execute on function public.platform_organizations() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- provision_organization: crea el gimnasio completo y deja a su dueño como
-- administrador. La cuenta de auth se crea antes, desde el servidor (la API de
-- administración manda el correo de invitación); aquí se arma lo demás en una
-- sola transacción, para que no quede un gimnasio a medias.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.provision_organization(
  p_name        text,
  p_slug        text,
  p_owner       uuid,
  p_branch_name text default 'Matriz',
  p_timezone    text default 'America/Mexico_City',
  p_currency    text default 'MXN'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Sólo la administración de la plataforma' using errcode = '42501';
  end if;

  if p_slug !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' then
    raise exception 'El identificador sólo admite minúsculas, números y guiones'
      using errcode = '22023';
  end if;
  if exists (select 1 from public.organizations o where o.slug = p_slug) then
    raise exception 'Ya existe un gimnasio con ese identificador' using errcode = 'P0001';
  end if;

  -- El trigger de alta crea el branding y las categorías de producto.
  insert into public.organizations (name, slug)
  values (p_name, p_slug)
  returning id into v_org;

  update public.org_branding
     set display_name = p_name,
         timezone     = p_timezone,
         currency     = p_currency
   where org_id = v_org;

  -- Sin al menos una sucursal no se puede abrir turno de caja, y sin turno no
  -- se puede vender: el gimnasio nacería inservible.
  insert into public.branches (org_id, name, timezone)
  values (v_org, coalesce(nullif(btrim(p_branch_name), ''), 'Matriz'), p_timezone);

  insert into public.org_members (org_id, user_id, role)
  values (v_org, p_owner, 'admin');

  return v_org;
end;
$$;

comment on function public.provision_organization(text, text, uuid, text, text, text) is
  'Da de alta un gimnasio con su branding, su primera sucursal y su dueño como '
  'administrador. Sólo la administración de la plataforma.';

revoke execute on function public.provision_organization(text, text, uuid, text, text, text) from public, anon;
grant  execute on function public.provision_organization(text, text, uuid, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- El administrador de un gimnasio necesita poder dar de baja a alguien de su
-- equipo. Faltaba la política de UPDATE sobre member_branches para reasignar
-- sucursales sin borrar y volver a crear.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "member_branches: admin can update"
  on public.member_branches for update to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.id = member_id and public.is_org_admin(m.org_id)
    )
  )
  with check (
    exists (
      select 1 from public.org_members m
      where m.id = member_id and public.is_org_admin(m.org_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- El correo en el perfil.
--   La pantalla de Equipo necesita mostrarlo, y vive en `auth.users`, que la
--   aplicación no puede leer sin la llave de servicio. Antes que usar esa llave
--   en una lectura de pantalla, se copia el correo al perfil: la RLS de
--   `profiles` ya permite que los compañeros de organización se vean entre sí.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column email extensions.citext;

comment on column public.profiles.email is
  'Copia del correo de auth.users para poder mostrarlo sin la llave de servicio.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, account_type, phone, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'account_type', 'staff'),
    new.raw_user_meta_data ->> 'phone',
    new.email
  )
  on conflict (id) do update
     set email = excluded.email;
  return new;
end;
$$;

-- Si el usuario cambia su correo, el perfil lo sigue.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_profile_email
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Perfiles que ya existían.
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id and p.email is null;
