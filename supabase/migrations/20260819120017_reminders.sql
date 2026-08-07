-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0017 · Fase 2 · Rebanada C · Recordatorios de vencimiento por correo       ║
-- ║                                                                            ║
-- ║ Cola de jobs (NO cron ingenuo): un agendado diario ENCOLA los avisos que   ║
-- ║ tocan hoy (−7, −3, 0, +7, +30 días vs end_date) y un worker (Edge Function)║
-- ║ los DRENA y envía. La unicidad (membresía, momento) garantiza que cada     ║
-- ║ aviso salga UNA sola vez. Configurable por organización; opt-out por        ║
-- ║ cliente. Agenda vía pg_cron + pg_net (resiliente: no rompe si faltan).     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Opt-out por cliente (barandilla: recordatorios con exclusión voluntaria).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.clients
  add column reminders_opt_out boolean not null default false;

comment on column public.clients.reminders_opt_out is
  'El cliente pidió NO recibir recordatorios de vencimiento por correo.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Configuración de recordatorios por organización.
--   "Sin fila" = todo habilitado (la enqueue usa coalesce), así que funciona
--   aunque el staff nunca abra los ajustes.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.org_reminder_settings (
  org_id          uuid primary key references public.organizations (id) on delete cascade,
  enabled         boolean not null default true,
  -- Momentos activos. Claves válidas: minus_7, minus_3, day_0, plus_7, plus_30.
  offsets_enabled text[] not null default '{minus_7,minus_3,day_0,plus_7,plus_30}',
  from_name       text,   -- override del remitente; por defecto branding.display_name
  reply_to        text,   -- override; por defecto branding.contact_email
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.org_reminder_settings is
  'Ajustes de recordatorios por organización (on/off global y por momento).';

create trigger trg_org_reminder_settings_updated_at
  before update on public.org_reminder_settings
  for each row execute function public.set_updated_at();

create trigger trg_audit_org_reminder_settings
  after insert or update or delete on public.org_reminder_settings
  for each row execute function public.audit_row();

-- ─────────────────────────────────────────────────────────────────────────────
-- Cola de recordatorios (outbox). Una fila por (membresía, momento).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.reminder_outbox (
  id                   uuid primary key default extensions.gen_random_uuid(),
  org_id               uuid not null references public.organizations (id) on delete cascade,
  client_id            uuid not null references public.clients (id) on delete cascade,
  client_membership_id uuid not null references public.client_memberships (id) on delete cascade,
  offset_key           text not null
                         check (offset_key in ('minus_7','minus_3','day_0','plus_7','plus_30')),
  due_on               date not null,
  email                extensions.citext not null,
  status               text not null default 'pending'
                         check (status in ('pending','sent','failed','skipped')),
  attempts             integer not null default 0,
  last_error           text,
  sent_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Cada aviso (momento) de una membresía se encola/envía una sola vez.
  unique (client_membership_id, offset_key)
);

comment on table public.reminder_outbox is
  'Cola de recordatorios de vencimiento. Se encola por enqueue_due_reminders y '
  'la Edge Function process-reminders la drena (envía) marcando sent/failed.';

create index reminder_outbox_status_due_idx on public.reminder_outbox (status, due_on);
create index reminder_outbox_org_idx        on public.reminder_outbox (org_id);

create trigger trg_reminder_outbox_updated_at
  before update on public.reminder_outbox
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Encolado: inserta los avisos cuyo momento cae HOY. Idempotente (ON CONFLICT).
--   SECURITY DEFINER → escribe en el outbox saltándose RLS (no hay política de
--   INSERT para authenticated; sólo esta función y service_role escriben).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.enqueue_due_reminders(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with offsets(offset_key, offset_days) as (
    values ('minus_7', -7), ('minus_3', -3), ('day_0', 0), ('plus_7', 7), ('plus_30', 30)
  ),
  ins as (
    insert into public.reminder_outbox
      (org_id, client_id, client_membership_id, offset_key, due_on, email)
    select cm.org_id, cm.client_id, cm.id, o.offset_key, p_today, c.email
    from public.client_memberships cm
    join public.clients c on c.id = cm.client_id
    cross join offsets o
    left join public.org_reminder_settings s on s.org_id = cm.org_id
    where cm.status <> 'cancelled'
      and cm.end_date + o.offset_days = p_today
      and c.email is not null
      and c.reminders_opt_out = false
      and coalesce(s.enabled, true)
      and (s.offsets_enabled is null or o.offset_key = any (s.offsets_enabled))
    on conflict (client_membership_id, offset_key) do nothing
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;

comment on function public.enqueue_due_reminders(date) is
  'Encola en reminder_outbox los recordatorios que vencen su momento en p_today.';

revoke execute on function public.enqueue_due_reminders(date) from public, anon, authenticated;
grant  execute on function public.enqueue_due_reminders(date) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS · org_reminder_settings / reminder_outbox
--   Ver ajustes/outbox: staff de la org. Editar ajustes: admin/gerente.
--   El outbox NO tiene política de escritura: sólo la función DEFINER y el
--   service_role (Edge Function) lo tocan.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.org_reminder_settings enable row level security;
alter table public.reminder_outbox       enable row level security;

create policy "reminder_settings: managers read"
  on public.org_reminder_settings for select to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager']::public.app_role[]));

create policy "reminder_settings: managers insert"
  on public.org_reminder_settings for insert to authenticated
  with check (public.has_role_in_org(org_id, array['admin','manager']::public.app_role[]));

create policy "reminder_settings: managers update"
  on public.org_reminder_settings for update to authenticated
  using (public.has_role_in_org(org_id, array['admin','manager']::public.app_role[]))
  with check (public.has_role_in_org(org_id, array['admin','manager']::public.app_role[]));

create policy "reminder_outbox: members read"
  on public.reminder_outbox for select to authenticated
  using (public.is_org_member(org_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- Runtime privado para el disparo por pg_net (URL del worker + secreto).
--   Esquema `private`, tabla de una fila, SIN grants ni políticas: sólo la lee
--   el owner (el job de cron corre como postgres). Se SIEMBRA en seed.sql para
--   local; en producción se sustituye la fila fuera de banda.
-- ─────────────────────────────────────────────────────────────────────────────
create schema if not exists private;

create table private.reminder_runtime (
  singleton     boolean primary key default true check (singleton),
  function_url  text not null,
  invoke_secret text not null,
  updated_at    timestamptz not null default now()
);

comment on table private.reminder_runtime is
  'URL de la Edge Function process-reminders y secreto de invocación (una fila).';

-- ─────────────────────────────────────────────────────────────────────────────
-- Agenda diaria (pg_cron + pg_net). Resiliente: si las extensiones no están
-- precargadas, degrada con NOTICE y el flujo sigue probándose manualmente.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net no disponible: %', sqlerrm;
end $$;

do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron no disponible: %', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- 15:00 UTC ≈ 09:00 America/Mexico_City. cron.schedule hace upsert por nombre.
    perform cron.schedule(
      'reminders-daily',
      '0 15 * * *',
      $cron$
        select public.enqueue_due_reminders();
        select net.http_post(
          url := (select function_url from private.reminder_runtime limit 1),
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-reminder-secret', (select invoke_secret from private.reminder_runtime limit 1)
          ),
          body := '{}'::jsonb
        );
      $cron$
    );
  else
    raise notice 'pg_cron ausente: se omite el agendado (enqueue manual disponible).';
  end if;
exception when others then
  raise notice 'No se pudo agendar reminders-daily: %', sqlerrm;
end $$;
