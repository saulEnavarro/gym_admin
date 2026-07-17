-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0012 · Fase 1 · Catálogo de membresías (planes)                            ║
-- ║                                                                            ║
-- ║ · Precios EDITABLES por organización.                                      ║
-- ║ · price = BASE GRAVABLE, SIN IVA. El 16% se desglosa aparte en el POS      ║
-- ║   (decisión §7 de la especificación).                                      ║
-- ║ · duration_days: vigencia que otorga la membresía (Mensual 30, Visita 1…). ║
-- ║ · max_members: 1 individual, 2 para "Parejas" (venta vinculada en el POS). ║
-- ║ · Gestión del catálogo: admin/gerente. Recepción sólo lo LEE (para vender).║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table public.membership_plans (
  id            uuid primary key default extensions.gen_random_uuid(),
  org_id        uuid  not null references public.organizations (id) on delete cascade,
  name          text  not null,
  description   text,
  -- Precio base SIN IVA, en la moneda de la organización.
  price         numeric(10, 2) not null check (price >= 0),
  -- Días de vigencia que otorga la membresía.
  duration_days integer not null default 30 check (duration_days >= 1),
  -- Personas cubiertas por una venta (2 = Parejas).
  max_members   integer not null default 1 check (max_members between 1 and 10),
  is_active     boolean not null default true,
  -- Orden de despliegue en el catálogo / POS.
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- No dos planes con el mismo nombre dentro de una organización.
  unique (org_id, name)
);

comment on table public.membership_plans is
  'Catálogo de membresías por organización. price es BASE SIN IVA (§7).';
comment on column public.membership_plans.price is
  'Precio base gravable, SIN IVA. El 16% se calcula y suma aparte en el POS.';
comment on column public.membership_plans.max_members is
  'Personas cubiertas por la venta (2 = Parejas, venta vinculada).';

create index membership_plans_org_idx        on public.membership_plans (org_id);
create index membership_plans_org_active_idx on public.membership_plans (org_id, is_active);

create trigger trg_membership_plans_updated_at
  before update on public.membership_plans
  for each row execute function public.set_updated_at();

-- Auditoría (función genérica; requiere columna org_id).
create trigger trg_audit_membership_plans
  after insert or update or delete on public.membership_plans
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS · membership_plans
--   Ver: cualquier miembro de la organización (recepción necesita leer para el POS).
--   Crear/editar/borrar: admin y gerente (configuración del catálogo).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.membership_plans enable row level security;

create policy "membership_plans: members can read"
  on public.membership_plans for select to authenticated
  using (public.is_org_member(org_id));

create policy "membership_plans: managers can insert"
  on public.membership_plans for insert to authenticated
  with check (
    public.has_role_in_org(org_id, array['admin', 'manager']::public.app_role[])
  );

create policy "membership_plans: managers can update"
  on public.membership_plans for update to authenticated
  using (
    public.has_role_in_org(org_id, array['admin', 'manager']::public.app_role[])
  )
  with check (
    public.has_role_in_org(org_id, array['admin', 'manager']::public.app_role[])
  );

create policy "membership_plans: managers can delete"
  on public.membership_plans for delete to authenticated
  using (
    public.has_role_in_org(org_id, array['admin', 'manager']::public.app_role[])
  );
