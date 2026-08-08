-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0018 · Fase 2 · Rebanada C (correcciones) · Cola de recordatorios          ║
-- ║                                                                            ║
-- ║ Tres huecos de 0017 que sólo se notan con el gimnasio operando un mes:     ║
-- ║                                                                            ║
-- ║ 1. RENOVACIÓN. El encolado miraba cada membresía por separado, así que a   ║
-- ║    quien renovaba le seguía llegando «tu membresía venció hace 7 días» de  ║
-- ║    la anterior — el peor destinatario posible: el que sí pagó. Ahora sólo  ║
-- ║    se avisa por la ÚLTIMA membresía no cancelada del cliente. Esto arregla ║
-- ║    de paso la renovación anticipada: con vigencias apiladas, la vieja ya   ║
-- ║    no dispara «vence en 7 días» mientras la nueva cubre al cliente.        ║
-- ║                                                                            ║
-- ║ 2. HUECOS DE AGENDA. El momento se buscaba por coincidencia EXACTA con     ║
-- ║    hoy: un día que el job no corriera, esos avisos se perdían para         ║
-- ║    siempre. Ahora barre una ventana hacia atrás; la unicidad               ║
-- ║    (membresía, momento) ya impedía duplicados, así que repasar es seguro.  ║
-- ║    `due_on` pasa a guardar la fecha REAL del momento, no el día del        ║
-- ║    barrido, para que se note cuánto se retrasó un envío.                   ║
-- ║                                                                            ║
-- ║ 3. REINTENTOS. Un fallo de SMTP dejaba la fila en 'failed' y nadie la      ║
-- ║    volvía a mirar; la especificación §6 pide reintentos. Ahora un fallo    ║
-- ║    reprograma con retroceso exponencial y sólo se rinde tras agotar los    ║
-- ║    intentos ('failed' queda como buzón de descarte).                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Reintentos: cuándo puede volver a intentarse y cuántas veces.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.reminder_outbox
  add column next_attempt_at timestamptz not null default now(),
  add column max_attempts    integer     not null default 5 check (max_attempts >= 1);

comment on column public.reminder_outbox.next_attempt_at is
  'No intentar el envío antes de este instante (retroceso exponencial).';
comment on column public.reminder_outbox.max_attempts is
  'Intentos antes de rendirse y marcar la fila como failed (descarte).';

-- El worker pide: pendientes, ya vencidas y listas para reintentar.
drop index if exists public.reminder_outbox_status_due_idx;
create index reminder_outbox_ready_idx
  on public.reminder_outbox (status, due_on, next_attempt_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- enqueue_due_reminders (v2)
--   Cambia la firma (gana p_lookback), así que se reemplaza la anterior: dejar
--   ambas volvería ambigua la llamada sin argumentos que hace el agendado.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.enqueue_due_reminders(date);

create or replace function public.enqueue_due_reminders(
  p_today    date    default current_date,
  p_lookback integer default 2
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_from  date := p_today - greatest(coalesce(p_lookback, 0), 0);
begin
  with offsets(offset_key, offset_days) as (
    values ('minus_7', -7), ('minus_3', -3), ('day_0', 0), ('plus_7', 7), ('plus_30', 30)
  ),
  ins as (
    insert into public.reminder_outbox
      (org_id, client_id, client_membership_id, offset_key, due_on, email)
    select cm.org_id, cm.client_id, cm.id, o.offset_key,
           cm.end_date + o.offset_days,          -- fecha real del momento
           c.email
    from public.client_memberships cm
    join public.clients c on c.id = cm.client_id
    cross join offsets o
    left join public.org_reminder_settings s on s.org_id = cm.org_id
    where cm.status <> 'cancelled'
      -- Ventana de recuperación en vez de coincidencia exacta.
      and cm.end_date + o.offset_days between v_from and p_today
      and c.email is not null
      and c.reminders_opt_out = false
      and coalesce(s.enabled, true)
      and (s.offsets_enabled is null or o.offset_key = any (s.offsets_enabled))
      -- Sólo la ÚLTIMA membresía del cliente avisa: si renovó (o apiló una
      -- vigencia por delante), la anterior deja de mandar nada. El desempate
      -- por id evita que dos filas con el mismo vencimiento avisen ambas.
      and not exists (
        select 1
        from public.client_memberships later
        where later.client_id = cm.client_id
          and later.status <> 'cancelled'
          and (later.end_date > cm.end_date
               or (later.end_date = cm.end_date and later.id > cm.id))
      )
    on conflict (client_membership_id, offset_key) do nothing
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;

comment on function public.enqueue_due_reminders(date, integer) is
  'Encola los recordatorios cuyo momento cayó entre p_today−p_lookback y p_today, '
  'sólo para la última membresía no cancelada de cada cliente.';

revoke execute on function public.enqueue_due_reminders(date, integer) from public, anon, authenticated;
grant  execute on function public.enqueue_due_reminders(date, integer) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Transiciones del envío. Viven en la base (y no en el worker) para que la
-- política de reintentos sea una sola y no dependa del cliente que la drene.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.mark_reminder_sent(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.reminder_outbox
     set status   = 'sent',
         sent_at  = now(),
         attempts = attempts + 1
   where id = p_id
     and status = 'pending';
$$;

comment on function public.mark_reminder_sent(uuid) is
  'Marca un recordatorio como enviado (sólo si seguía pendiente).';

create or replace function public.mark_reminder_failed(p_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempts integer;
  v_max      integer;
begin
  select attempts + 1, max_attempts
    into v_attempts, v_max
  from public.reminder_outbox
  where id = p_id
    and status = 'pending';

  if not found then
    return;  -- ya se envió o ya se descartó: no se toca
  end if;

  update public.reminder_outbox
     set attempts   = v_attempts,
         last_error = left(coalesce(p_error, 'error desconocido'), 500),
         -- Agotados los intentos, 'failed' es el buzón de descarte: deja de
         -- reintentarse y queda visible en la UI para revisarlo a mano.
         status     = case when v_attempts >= v_max then 'failed' else 'pending' end,
         -- Retroceso exponencial: 5 min, 15 min, 45 min, 2 h 15…
         next_attempt_at = now() + (interval '5 minutes' * power(3, v_attempts - 1))
   where id = p_id;
end;
$$;

comment on function public.mark_reminder_failed(uuid, text) is
  'Registra un fallo de envío: reprograma con retroceso exponencial y descarta '
  'la fila al agotar max_attempts.';

revoke execute on function public.mark_reminder_sent(uuid)         from public, anon, authenticated;
revoke execute on function public.mark_reminder_failed(uuid, text) from public, anon, authenticated;
grant  execute on function public.mark_reminder_sent(uuid)         to service_role;
grant  execute on function public.mark_reminder_failed(uuid, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Agenda: se separa en dos. Encolar es un asunto DIARIO (el momento cae un día
-- concreto); drenar tiene que ser FRECUENTE, o un reintento programado a 15
-- minutos esperaría hasta el día siguiente y los reintentos no servirían de nada.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- El agendado combinado de 0017 se reemplaza por los dos de abajo.
    perform cron.unschedule('reminders-daily');
  end if;
exception when others then
  raise notice 'No había job reminders-daily que retirar: %', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- 15:00 UTC ≈ 09:00 America/Mexico_City (a esa hora la fecha UTC y la
    -- local coinciden, así que `current_date` del encolado es el día correcto).
    perform cron.schedule(
      'reminders-enqueue-daily',
      '0 15 * * *',
      $cron$ select public.enqueue_due_reminders(); $cron$
    );

    perform cron.schedule(
      'reminders-drain-hourly',
      '7 * * * *',
      $cron$
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
    raise notice 'pg_cron ausente: se omite el agendado.';
  end if;
exception when others then
  raise notice 'No se pudieron agendar los jobs de recordatorios: %', sqlerrm;
end $$;
