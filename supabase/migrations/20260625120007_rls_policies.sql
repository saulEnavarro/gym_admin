-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0007 · Row-Level Security en TODAS las tablas operativas                   ║
-- ║                                                                            ║
-- ║ Regla del proyecto (§2): ninguna tabla operativa sin política RLS.         ║
-- ║ Cierra de raíz fuga entre inquilinos e IDOR. El alta de organizaciones     ║
-- ║ es un flujo privilegiado (service_role): por eso varias tablas NO tienen   ║
-- ║ política de INSERT para `authenticated`.                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.organizations  enable row level security;
alter table public.branches       enable row level security;
alter table public.profiles       enable row level security;
alter table public.org_members    enable row level security;
alter table public.member_branches enable row level security;
alter table public.org_branding   enable row level security;
alter table public.audit_logs     enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- organizations
--   Ver: las orgs a las que perteneces. Editar: sólo admin. Crear/borrar: nadie
--   por API (onboarding y borrado se hacen con service_role).
-- ─────────────────────────────────────────────────────────────────────────────
create policy "orgs: members can read"
  on public.organizations for select to authenticated
  using (id in (select public.current_user_org_ids()));

create policy "orgs: admin can update"
  on public.organizations for update to authenticated
  using (public.is_org_admin(id))
  with check (public.is_org_admin(id));

-- ─────────────────────────────────────────────────────────────────────────────
-- branches
--   Ver: miembros de la org. Crear/editar/borrar: admin de la org.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "branches: members can read"
  on public.branches for select to authenticated
  using (public.is_org_member(org_id));

create policy "branches: admin can insert"
  on public.branches for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy "branches: admin can update"
  on public.branches for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy "branches: admin can delete"
  on public.branches for delete to authenticated
  using (public.is_org_admin(org_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
--   Ver: el tuyo y el de tus compañeros de organización. Editar: sólo el tuyo.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "profiles: self or org peers can read"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_org_with(id));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- org_members
--   Ver: tus membresías y las de tu org. Gestionar: admin de la org.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "members: read own or same org"
  on public.org_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or org_id in (select public.current_user_org_ids())
  );

create policy "members: admin can insert"
  on public.org_members for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy "members: admin can update"
  on public.org_members for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

create policy "members: admin can delete"
  on public.org_members for delete to authenticated
  using (public.is_org_admin(org_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- member_branches
--   Resolución de org vía el org_member referenciado.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "member_branches: read same org"
  on public.member_branches for select to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.id = member_id and public.is_org_member(m.org_id)
    )
  );

create policy "member_branches: admin can insert"
  on public.member_branches for insert to authenticated
  with check (
    exists (
      select 1 from public.org_members m
      where m.id = member_id and public.is_org_admin(m.org_id)
    )
  );

create policy "member_branches: admin can delete"
  on public.member_branches for delete to authenticated
  using (
    exists (
      select 1 from public.org_members m
      where m.id = member_id and public.is_org_admin(m.org_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- org_branding
--   Ver: miembros de la org. Editar: admin. (El alta inicial la hace un trigger
--   SECURITY DEFINER, que no está sujeto a estas políticas.)
-- ─────────────────────────────────────────────────────────────────────────────
create policy "branding: members can read"
  on public.org_branding for select to authenticated
  using (public.is_org_member(org_id));

create policy "branding: admin can insert"
  on public.org_branding for insert to authenticated
  with check (public.is_org_admin(org_id));

create policy "branding: admin can update"
  on public.org_branding for update to authenticated
  using (public.is_org_admin(org_id))
  with check (public.is_org_admin(org_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- audit_logs  (append-only)
--   Ver: sólo admin de la org. Insertar: sólo la función audit_row (SECURITY
--   DEFINER). Sin políticas de INSERT/UPDATE/DELETE ⇒ inmutable vía API.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "audit: admin can read"
  on public.audit_logs for select to authenticated
  using (org_id is not null and public.is_org_admin(org_id));
