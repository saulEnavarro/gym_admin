-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0010 · Fase 1 · Clientes (ficha completa) + contadores consecutivos        ║
-- ║                                                                            ║
-- ║ · Número de cliente CONSECUTIVO por organización (Cliente #0001…).         ║
-- ║ · Ficha completa (datos, contacto de emergencia, foto en Storage privado). ║
-- ║ · Consentimiento LFPDPPP; consentimiento de tutor para menores.            ║
-- ║ · RLS aislado por organización + auditoría (regla del proyecto §2).        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- org_counters: contadores consecutivos por organización y recurso.
--   Reutilizable para folios de venta, número de cliente, etc. El incremento es
--   atómico (INSERT … ON CONFLICT DO UPDATE … RETURNING) → sin condiciones de
--   carrera aun con altas concurrentes.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.org_counters (
  org_id  uuid  not null references public.organizations (id) on delete cascade,
  name    text  not null,                 -- 'client', 'sale', …
  value   bigint not null default 0,
  primary key (org_id, name)
);

comment on table public.org_counters is
  'Contadores consecutivos por organización (número de cliente, folios, …).';

-- Devuelve el siguiente valor del contador (p_org, p_name), creándolo si no existe.
create or replace function public.next_counter(p_org uuid, p_name text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value bigint;
begin
  insert into public.org_counters (org_id, name, value)
  values (p_org, p_name, 1)
  on conflict (org_id, name)
    do update set value = public.org_counters.value + 1
  returning value into v_value;
  return v_value;
end;
$$;

comment on function public.next_counter(uuid, text) is
  'Incrementa y devuelve atómicamente un contador consecutivo por organización.';

-- El contador se manipula sólo vía la función SECURITY DEFINER; nadie por API.
alter table public.org_counters enable row level security;
revoke execute on function public.next_counter(uuid, text) from public, anon;
grant  execute on function public.next_counter(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- clients: ficha del cliente del gimnasio.
--   La EDAD no se almacena: se deriva de birth_date en la app (evita datos
--   inconsistentes). El estado "vencido" se derivará de las membresías (slice
--   posterior); aquí sólo llevamos is_active (alta/baja manual).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.clients (
  id              uuid primary key default extensions.gen_random_uuid(),
  org_id          uuid  not null references public.organizations (id) on delete cascade,
  -- Sucursal donde se dio de alta (informativa; el cliente puede usar cualquiera).
  branch_id       uuid  references public.branches (id) on delete set null,
  -- Consecutivo por organización, asignado por trigger. Se muestra como #0001.
  member_number   bigint not null,

  first_name      text  not null,
  last_name       text  not null,
  birth_date      date,
  sex             text  check (sex in ('female', 'male', 'other', 'undisclosed')),

  mobile_phone    text,
  phone           text,
  email           extensions.citext,
  address         text,

  emergency_contact_name  text,
  emergency_contact_phone text,

  photo_url       text,   -- ruta en bucket privado 'client-photos', nunca pública
  notes           text,

  -- Consentimiento de datos (LFPDPPP). Guardamos el instante de aceptación.
  data_consent_at timestamptz,
  -- Menores de edad: consentimiento del tutor (barandilla §5.8).
  guardian_consent boolean not null default false,
  guardian_name    text,

  is_active       boolean not null default true,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- El número de cliente es único dentro de la organización.
  unique (org_id, member_number)
);

comment on table public.clients is
  'Ficha del cliente del gimnasio. Aislada por org; foto en Storage privado.';
comment on column public.clients.member_number is
  'Número consecutivo por organización (se muestra como #0001). Lo asigna un trigger.';
comment on column public.clients.data_consent_at is
  'Instante de aceptación del aviso de privacidad (LFPDPPP).';

create index clients_org_idx           on public.clients (org_id);
create index clients_org_branch_idx    on public.clients (org_id, branch_id);
create index clients_org_active_idx    on public.clients (org_id, is_active);
create index clients_org_lastname_idx  on public.clients (org_id, last_name, first_name);
-- Búsqueda rápida por email dentro de la org.
create index clients_org_email_idx     on public.clients (org_id, email);

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- Asigna el número consecutivo al insertar (si no viene ya explícito).
create or replace function public.assign_client_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.member_number is null then
    new.member_number := public.next_counter(new.org_id, 'client');
  end if;
  return new;
end;
$$;

create trigger trg_clients_assign_number
  before insert on public.clients
  for each row execute function public.assign_client_number();

-- Auditoría de la tabla (usa la función genérica; requiere columna org_id).
create trigger trg_audit_clients
  after insert or update or delete on public.clients
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS · clients
--   Ver: cualquier miembro de la organización.
--   Crear/editar: admin, gerente y recepcionista (operación de mostrador).
--   Borrar: sólo admin y gerente (la recepción da de baja con is_active).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.clients enable row level security;

create policy "clients: members can read"
  on public.clients for select to authenticated
  using (public.is_org_member(org_id));

create policy "clients: staff can insert"
  on public.clients for insert to authenticated
  with check (
    public.has_role_in_org(
      org_id,
      array['admin', 'manager', 'receptionist']::public.app_role[]
    )
  );

create policy "clients: staff can update"
  on public.clients for update to authenticated
  using (
    public.has_role_in_org(
      org_id,
      array['admin', 'manager', 'receptionist']::public.app_role[]
    )
  )
  with check (
    public.has_role_in_org(
      org_id,
      array['admin', 'manager', 'receptionist']::public.app_role[]
    )
  );

create policy "clients: managers can delete"
  on public.clients for delete to authenticated
  using (
    public.has_role_in_org(
      org_id,
      array['admin', 'manager']::public.app_role[]
    )
  );
