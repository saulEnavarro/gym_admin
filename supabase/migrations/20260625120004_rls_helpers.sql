-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0004 · Funciones helper para RLS                                           ║
-- ║                                                                            ║
-- ║ Son SECURITY DEFINER (corren como owner) con search_path vacío:            ║
-- ║   1. Leen org_members SIN disparar su RLS → evitan recursión infinita.     ║
-- ║   2. search_path='' + nombres calificados → blindadas contra hijacking.    ║
-- ║ Sólo consultan datos del PROPIO usuario (auth.uid()), por eso es seguro    ║
-- ║ exponerlas a `authenticated`.                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Orgs a las que pertenece el usuario actual (activo).
create or replace function public.current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id
  from public.org_members m
  where m.user_id = (select auth.uid())
    and m.is_active;
$$;

-- ¿El usuario actual pertenece a esta organización?
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = target_org
      and m.user_id = (select auth.uid())
      and m.is_active
  );
$$;

-- ¿El usuario tiene alguno de estos roles en la organización?
create or replace function public.has_role_in_org(target_org uuid, roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = target_org
      and m.user_id = (select auth.uid())
      and m.is_active
      and m.role = any (roles)
  );
$$;

-- ¿El usuario es administrador de la organización?
create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role_in_org(target_org, array['admin']::public.app_role[]);
$$;

-- Sucursales que el usuario puede operar:
--   · Admin → todas las sucursales de sus organizaciones.
--   · Resto → sólo las asignadas en member_branches.
create or replace function public.current_user_branch_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select mb.branch_id
  from public.member_branches mb
  join public.org_members m on m.id = mb.member_id
  where m.user_id = (select auth.uid())
    and m.is_active
  union
  select b.id
  from public.branches b
  join public.org_members m on m.org_id = b.org_id
  where m.user_id = (select auth.uid())
    and m.is_active
    and m.role = 'admin';
$$;

-- ¿El usuario puede acceder a esta sucursal?
create or replace function public.can_access_branch(target_branch uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_branch in (select public.current_user_branch_ids());
$$;

-- ¿El usuario comparte alguna organización con `target_user`?
-- Usado para que el staff pueda ver los perfiles de sus compañeros de org.
create or replace function public.shares_org_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.org_members a
    join public.org_members b on a.org_id = b.org_id
    where a.user_id = (select auth.uid())
      and a.is_active
      and b.user_id = target_user
      and b.is_active
  );
$$;

-- Sólo los usuarios autenticados pueden invocar estos helpers.
revoke execute on function public.current_user_org_ids()       from public, anon;
revoke execute on function public.is_org_member(uuid)          from public, anon;
revoke execute on function public.has_role_in_org(uuid, public.app_role[]) from public, anon;
revoke execute on function public.is_org_admin(uuid)           from public, anon;
revoke execute on function public.current_user_branch_ids()    from public, anon;
revoke execute on function public.can_access_branch(uuid)      from public, anon;
revoke execute on function public.shares_org_with(uuid)        from public, anon;

grant execute on function public.current_user_org_ids()        to authenticated;
grant execute on function public.is_org_member(uuid)           to authenticated;
grant execute on function public.has_role_in_org(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_org_admin(uuid)            to authenticated;
grant execute on function public.current_user_branch_ids()     to authenticated;
grant execute on function public.can_access_branch(uuid)       to authenticated;
grant execute on function public.shares_org_with(uuid)         to authenticated;
