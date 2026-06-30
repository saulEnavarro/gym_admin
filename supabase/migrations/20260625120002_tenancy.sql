-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0002 · Multi-tenancy: organizaciones y sucursales                          ║
-- ║                                                                            ║
-- ║ Jerarquía:  Organización (inquilino) └── Sucursal └── datos operativos     ║
-- ║ Toda tabla operativa llevará org_id (y branch_id donde aplique).           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Roles de la aplicación (mismos que la especificación §3).
create type public.app_role as enum (
  'admin',         -- Administrador: toda la organización, todas las sucursales
  'manager',       -- Gerente: una o varias sucursales asignadas
  'receptionist',  -- Recepcionista: operación de su sucursal (POS, caja, check-in)
  'instructor',    -- Instructor: clases / acceso limitado
  'client'         -- Cliente: sólo su portal (auth separada del staff)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Organizaciones (inquilinos): un gimnasio / marca.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.organizations (
  id          uuid primary key default extensions.gen_random_uuid(),
  name        text not null,
  slug        extensions.citext not null unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint organizations_slug_format
    check (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')
);

comment on table public.organizations is
  'Inquilinos del SaaS. Raíz de la jerarquía multi-tenant.';

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Sucursales: pertenecen a una organización.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.branches (
  id          uuid primary key default extensions.gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null,
  timezone    text not null default 'America/Mexico_City',
  address     text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.branches is
  'Sucursales de una organización. Unidad operativa (POS, caja, accesos).';

create index branches_org_id_idx on public.branches (org_id);

create trigger trg_branches_updated_at
  before update on public.branches
  for each row execute function public.set_updated_at();
