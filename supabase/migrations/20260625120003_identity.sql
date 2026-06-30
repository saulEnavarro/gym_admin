-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0003 · Identidad: perfiles, pertenencia a organización y a sucursales      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles: extensión 1:1 de auth.users (gestionado por Supabase Auth).
-- Tanto staff como clientes tienen una fila aquí; account_type los distingue.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  avatar_url    text,
  account_type  text not null default 'staff'
                  check (account_type in ('staff', 'client')),
  phone         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil 1:1 con auth.users. account_type separa staff de clientes (portal).';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- org_members: vincula un usuario a una organización con UN rol.
-- Es la fuente de verdad para "a qué org pertenece" y "qué rol tiene".
-- ─────────────────────────────────────────────────────────────────────────────
create table public.org_members (
  id          uuid primary key default extensions.gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.app_role not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Un usuario tiene a lo sumo un rol por organización.
  unique (org_id, user_id)
);

comment on table public.org_members is
  'Pertenencia usuario↔organización con rol. Fuente de verdad de RLS.';

create index org_members_user_id_idx on public.org_members (user_id);
create index org_members_org_id_idx  on public.org_members (org_id);

create trigger trg_org_members_updated_at
  before update on public.org_members
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- member_branches: sucursales asignadas a un miembro.
--   · Admin: NO necesita filas aquí → ve todas las sucursales de su org.
--   · Gerente: una o varias sucursales.
--   · Recepcionista / Instructor: típicamente una.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.member_branches (
  member_id   uuid not null references public.org_members (id) on delete cascade,
  branch_id   uuid not null references public.branches (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (member_id, branch_id)
);

comment on table public.member_branches is
  'Sucursales asignadas a un miembro (no aplica a admin, que ve todas).';

create index member_branches_branch_id_idx on public.member_branches (branch_id);
