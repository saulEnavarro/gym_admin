-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0021 · Fase 3 · Rebanada A · Control de acceso (check-in / check-out)     ║
-- ║                                                                            ║
-- ║ CREDENCIAL. Hasta ahora el QR del portal llevaba `clients.id` en crudo, y  ║
-- ║ ese id ya viaja en las URLs del panel: como credencial de puerta es débil. ║
-- ║ Se le da al socio un token propio, revocable y con caducidad.              ║
-- ║                                                                            ║
-- ║ CADUCIDAD LARGA A PROPÓSITO. Muchos gimnasios no tienen WiFi para los      ║
-- ║ socios, así que el QR tiene que servir desde una captura de pantalla       ║
-- ║ tomada días antes. Por eso el token dura 90 días y sólo se renueva cuando  ║
-- ║ el socio abre el portal CON datos (momento en que puede capturar el        ║
-- ║ nuevo). Consecuencia honesta: con capturas permitidas, la caducidad no es  ║
-- ║ un control anti-préstamo fuerte — el control real es que la pantalla de    ║
-- ║ check-in muestre la FOTO del socio, y que recepción pueda revocar el token.║
-- ║                                                                            ║
-- ║ VENCIDA = NO ENTRA, salvo autorización explícita de recepción, que queda   ║
-- ║ registrada con quién autorizó y por qué.                                   ║
-- ║                                                                            ║
-- ║ La visita cierra al escanear la salida; un barrido cierra las que nadie    ║
-- ║ cerró, o «quién está dentro» acumularía gente que se fue hace días.        ║
-- ║                                                                            ║
-- ║ access_logs va PARTICIONADA por mes (especificación §6: crece sin límite). ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Capacidad de la sucursal (base del % de ocupación de la rebanada B).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.branches
  add column capacity integer check (capacity is null or capacity > 0);

comment on column public.branches.capacity is
  'Aforo máximo de la sucursal. NULL = sin límite declarado.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Credencial de acceso del socio.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.clients
  add column access_token            text,
  add column access_token_expires_at timestamptz;

comment on column public.clients.access_token is
  'Secreto del QR de acceso. Distinto de clients.id, que ya se expone en URLs.';
comment on column public.clients.access_token_expires_at is
  'Caducidad del QR. Se renueva desde el portal cuando faltan menos de 15 días.';

create unique index clients_access_token_key
  on public.clients (access_token)
  where access_token is not null;

/**
 * Token nuevo para el QR del socio. Devuelve el token emitido.
 *
 * Va SECURITY DEFINER con la autorización comprobada A MANO, y no apoyada en
 * una política de UPDATE sobre `clients`. La razón: el portal necesita rotar el
 * token del propio socio, pero una política «el socio puede actualizar su
 * fila» le abriría TODAS las columnas — podría reactivarse tras una baja
 * (`is_active`) o mudar su ficha a otra organización (`org_id`). Aquí el socio
 * sólo puede tocar, y sólo de su propia ficha, estas dos columnas.
 */
create or replace function public.issue_access_token(
  p_client uuid,
  p_days   integer default 90
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_org   uuid;
begin
  select c.org_id into v_org from public.clients c where c.id = p_client;
  if not found then
    raise exception 'Cliente no encontrado' using errcode = 'P0002';
  end if;

  if not (
    public.has_role_in_org(v_org, array['admin','manager','receptionist']::public.app_role[])
    or p_client = public.current_client_id()
  ) then
    raise exception 'No puedes emitir el código de acceso de este socio'
      using errcode = '42501';
  end if;

  -- 16 bytes aleatorios en hex: 32 caracteres, sin símbolos que compliquen el QR.
  v_token := encode(extensions.gen_random_bytes(16), 'hex');

  update public.clients
     set access_token            = v_token,
         access_token_expires_at = now() + make_interval(days => greatest(p_days, 1))
   where id = p_client;

  return v_token;
end;
$$;

comment on function public.issue_access_token(uuid, integer) is
  'Emite (o rota) el token del QR de acceso de un socio e invalida el anterior. '
  'Autoriza a staff de la organización y al propio socio desde el portal.';

revoke execute on function public.issue_access_token(uuid, integer) from public, anon;
grant  execute on function public.issue_access_token(uuid, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Bitácora de accesos, particionada por mes.
--   La llave primaria incluye entered_at porque Postgres exige que la clave de
--   partición forme parte de cualquier índice único de una tabla particionada.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.access_logs (
  id                   uuid not null default extensions.gen_random_uuid(),
  org_id               uuid not null references public.organizations (id) on delete cascade,
  branch_id            uuid references public.branches (id) on delete set null,
  client_id            uuid not null references public.clients (id) on delete cascade,
  client_membership_id uuid references public.client_memberships (id) on delete set null,

  entered_at           timestamptz not null default now(),
  method               text not null check (method in ('qr', 'manual')),

  exited_at            timestamptz,
  -- 'auto' = lo cerró el barrido, no el socio: el tiempo dentro es estimado.
  exit_method          text check (exit_method in ('qr', 'manual', 'auto')),

  -- Acceso con membresía vencida autorizado a mano por recepción.
  authorized_by        uuid references auth.users (id) on delete set null,
  override_reason      text,

  recorded_by          uuid references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),

  primary key (id, entered_at),
  constraint access_logs_exit_after_entry check (exited_at is null or exited_at >= entered_at),
  constraint access_logs_exit_fields check (
    (exited_at is null and exit_method is null) or
    (exited_at is not null and exit_method is not null)
  )
) partition by range (entered_at);

comment on table public.access_logs is
  'Entradas y salidas al gimnasio. Particionada por mes: crece sin límite (§6).';

create index access_logs_org_entered_idx on public.access_logs (org_id, entered_at desc);
create index access_logs_client_idx      on public.access_logs (client_id, entered_at desc);
-- «Quién está dentro»: visitas sin salida registrada.
create index access_logs_open_idx        on public.access_logs (org_id, branch_id, exited_at);

/**
 * Crea (si falta) la partición mensual que cubre p_month. Idempotente, para
 * poder llamarla desde un job sin comprobar nada antes.
 */
create or replace function public.ensure_access_log_partition(p_month date)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_from date := date_trunc('month', p_month)::date;
  v_to   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_name text := 'access_logs_' || to_char(v_from, 'YYYYMM');
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v_name
  ) then
    execute format(
      'create table public.%I partition of public.access_logs for values from (%L) to (%L)',
      v_name, v_from, v_to
    );
  end if;
end;
$$;

revoke execute on function public.ensure_access_log_partition(date) from public, anon, authenticated;
grant  execute on function public.ensure_access_log_partition(date) to service_role;

-- Particiones del mes actual y de los dos siguientes (colchón por si el job
-- falla: sin partición, un INSERT revienta y nadie podría entrar al gimnasio).
select public.ensure_access_log_partition(current_date);
select public.ensure_access_log_partition((current_date + interval '1 month')::date);
select public.ensure_access_log_partition((current_date + interval '2 months')::date);

-- ─────────────────────────────────────────────────────────────────────────────
-- check_in: resuelve al socio (QR o alta manual), decide y registra.
--   Devuelve un JSON con el veredicto y los datos que la pantalla de recepción
--   necesita pintar —incluida la foto— en un solo viaje.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.check_in(
  p_token           text  default null,
  p_client          uuid  default null,
  p_branch          uuid  default null,
  p_override_reason text  default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_client    public.clients%rowtype;
  v_mem       public.client_memberships%rowtype;
  v_status    text;
  v_days      integer;
  v_open      uuid;
  v_log       uuid;
  v_org       uuid;
  v_authorized boolean := false;
begin
  if p_token is null and p_client is null then
    raise exception 'Escanea un código o elige un socio' using errcode = '22023';
  end if;

  -- RLS acota la búsqueda a la organización de quien atiende: el QR de otro
  -- gimnasio simplemente no encuentra ficha.
  if p_token is not null then
    select * into v_client from public.clients c
     where c.access_token = p_token
     limit 1;
    if not found then
      return jsonb_build_object('status', 'denied', 'reason', 'invalid_token');
    end if;
    if v_client.access_token_expires_at is not null
       and v_client.access_token_expires_at < now() then
      return jsonb_build_object(
        'status', 'denied', 'reason', 'expired_token',
        'client', public.access_client_json(v_client));
    end if;
  else
    select * into v_client from public.clients c where c.id = p_client;
    if not found then
      return jsonb_build_object('status', 'denied', 'reason', 'client_not_found');
    end if;
  end if;

  v_org := v_client.org_id;

  if not v_client.is_active then
    return jsonb_build_object(
      'status', 'denied', 'reason', 'inactive_client',
      'client', public.access_client_json(v_client));
  end if;

  if p_branch is not null and not public.can_access_branch(p_branch) then
    raise exception 'No puedes operar esa sucursal' using errcode = '42501';
  end if;

  -- Membresía vigente = la de vencimiento más lejano entre las no canceladas.
  select * into v_mem
  from public.client_memberships cm
  where cm.client_id = v_client.id
    and cm.status <> 'cancelled'
  order by cm.end_date desc
  limit 1;

  if not found then
    v_status := 'none';
    v_days := null;
  else
    v_days := v_mem.end_date - current_date;
    v_status := case when v_days >= 0 then 'active' else 'expired' end;
  end if;

  -- Vencida (o sin membresía): no entra, salvo autorización explícita.
  if v_status <> 'active' then
    if p_override_reason is null or btrim(p_override_reason) = '' then
      return jsonb_build_object(
        'status', 'denied',
        'reason', case when v_status = 'none' then 'no_membership' else 'expired_membership' end,
        'days', v_days,
        'client', public.access_client_json(v_client),
        'membership', case when v_mem.id is null then null else
          jsonb_build_object('plan_name', v_mem.plan_name, 'end_date', v_mem.end_date) end);
    end if;
    v_authorized := true;
  end if;

  -- Ya está dentro: no se duplica la visita (un segundo escaneo por nervios no
  -- debe contar como dos personas en la ocupación).
  select a.id into v_open
  from public.access_logs a
  where a.client_id = v_client.id
    and a.exited_at is null
    and a.entered_at > now() - interval '18 hours'
  order by a.entered_at desc
  limit 1;

  if v_open is not null then
    return jsonb_build_object(
      'status', 'already_inside',
      'access_log_id', v_open,
      'client', public.access_client_json(v_client));
  end if;

  insert into public.access_logs (
    org_id, branch_id, client_id, client_membership_id, method,
    authorized_by, override_reason, recorded_by
  ) values (
    v_org, p_branch, v_client.id, v_mem.id,
    case when p_token is not null then 'qr' else 'manual' end,
    case when v_authorized then (select auth.uid()) else null end,
    case when v_authorized then btrim(p_override_reason) else null end,
    (select auth.uid())
  )
  returning id into v_log;

  return jsonb_build_object(
    'status', case when v_authorized then 'authorized' else 'granted' end,
    'reason', case when v_authorized then
      case when v_status = 'none' then 'no_membership' else 'expired_membership' end
      else null end,
    'days', v_days,
    'access_log_id', v_log,
    'client', public.access_client_json(v_client),
    'membership', case when v_mem.id is null then null else
      jsonb_build_object('plan_name', v_mem.plan_name, 'end_date', v_mem.end_date) end);
end;
$$;

/** Datos del socio que la pantalla de recepción necesita para identificarlo. */
create or replace function public.access_client_json(c public.clients)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'member_number', c.member_number,
    'first_name', c.first_name,
    'last_name', c.last_name,
    'photo_url', c.photo_url
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- check_out: cierra la visita abierta del socio.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.check_out(
  p_token  text default null,
  p_client uuid default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_client public.clients%rowtype;
  v_log    public.access_logs%rowtype;
begin
  if p_token is not null then
    select * into v_client from public.clients c where c.access_token = p_token limit 1;
  else
    select * into v_client from public.clients c where c.id = p_client;
  end if;

  if not found then
    return jsonb_build_object('status', 'denied', 'reason', 'invalid_token');
  end if;

  select * into v_log
  from public.access_logs a
  where a.client_id = v_client.id
    and a.exited_at is null
    and a.entered_at > now() - interval '18 hours'
  order by a.entered_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'status', 'not_inside',
      'client', public.access_client_json(v_client));
  end if;

  update public.access_logs
     set exited_at   = now(),
         exit_method = case when p_token is not null then 'qr' else 'manual' end
   where id = v_log.id
     and entered_at = v_log.entered_at;

  return jsonb_build_object(
    'status', 'checked_out',
    'access_log_id', v_log.id,
    'minutes', ceil(extract(epoch from (now() - v_log.entered_at)) / 60)::integer,
    'client', public.access_client_json(v_client));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- close_stale_visits: red de seguridad. Sin esto, quien no escanea la salida se
-- queda «dentro» para siempre y la ocupación en vivo no sirve de nada.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.close_stale_visits(p_hours integer default 12)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.access_logs
     set exited_at   = entered_at + make_interval(hours => greatest(p_hours, 1)),
         exit_method = 'auto'
   where exited_at is null
     and entered_at < now() - make_interval(hours => greatest(p_hours, 1));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.close_stale_visits(integer) is
  'Cierra las visitas que nadie cerró (exit_method = auto: duración estimada).';

revoke execute on function public.close_stale_visits(integer) from public, anon, authenticated;
grant  execute on function public.close_stale_visits(integer) to service_role;

revoke execute on function public.check_in(text, uuid, uuid, text) from public, anon;
revoke execute on function public.check_out(text, uuid)            from public, anon;
grant  execute on function public.check_in(text, uuid, uuid, text) to authenticated;
grant  execute on function public.check_out(text, uuid)            to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS · access_logs
--   Ver: staff de la org y, además, el socio ve SUS propios accesos (historial
--   del portal). Escribir: staff. Nada se borra: la bitácora es append-only.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.access_logs enable row level security;

create policy "access_logs: members can read"
  on public.access_logs for select to authenticated
  using (public.is_org_member(org_id));

create policy "access_logs: portal client reads own"
  on public.access_logs for select to authenticated
  using (client_id = public.current_client_id());

create policy "access_logs: staff can insert"
  on public.access_logs for insert to authenticated
  with check (
    public.has_role_in_org(org_id, array['admin','manager','receptionist','instructor']::public.app_role[])
  );

create policy "access_logs: staff can update"
  on public.access_logs for update to authenticated
  using (
    public.has_role_in_org(org_id, array['admin','manager','receptionist','instructor']::public.app_role[])
  )
  with check (
    public.has_role_in_org(org_id, array['admin','manager','receptionist','instructor']::public.app_role[])
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Agenda: partición del mes siguiente y cierre de visitas colgadas.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'access-partitions-monthly',
      '0 3 1 * *',
      $cron$ select public.ensure_access_log_partition((current_date + interval '2 months')::date); $cron$
    );
    perform cron.schedule(
      'access-close-stale-hourly',
      '13 * * * *',
      $cron$ select public.close_stale_visits(12); $cron$
    );
  else
    raise notice 'pg_cron ausente: particiones y cierre de visitas quedan manuales.';
  end if;
exception when others then
  raise notice 'No se pudieron agendar los jobs de acceso: %', sqlerrm;
end $$;
