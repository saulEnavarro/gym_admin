-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0019 · Fase 2 · Recordatorios: un solo aviso y sin reintentos             ║
-- ║                                                                            ║
-- ║ Decisión del negocio: basta con avisar UNA vez, siete días antes de que    ║
-- ║ venza la membresía. Los otros cuatro momentos (−3, día 0, +7, +30) siguen  ║
-- ║ existiendo y se pueden encender desde /settings/reminders, pero ya no      ║
-- ║ vienen activos: un gimnasio que no toque la configuración manda un correo  ║
-- ║ por membresía y nada más.                                                  ║
-- ║                                                                            ║
-- ║ También se apagan los reintentos de envío: `max_attempts` pasa a 1, así    ║
-- ║ que un fallo de SMTP manda la fila directo a 'failed' (queda visible en la ║
-- ║ cola para revisarla a mano). La maquinaria de reintentos de 0018 se queda  ║
-- ║ en su sitio —es sólo un número por fila— para poder reactivarla subiendo   ║
-- ║ max_attempts, sin migrar nada.                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Nuevos valores por omisión.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.org_reminder_settings
  alter column offsets_enabled set default '{minus_7}';

alter table public.reminder_outbox
  alter column max_attempts set default 1;

-- Organizaciones que ya tenían configuración: se alinean a la nueva política.
-- (Si alguien quiere más momentos, los enciende de nuevo desde la UI.)
update public.org_reminder_settings
   set offsets_enabled = '{minus_7}'
 where offsets_enabled <> '{minus_7}'::text[];

-- Avisos aún en cola: que no reintenten.
update public.reminder_outbox
   set max_attempts = 1
 where status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- enqueue_due_reminders (v3)
--   Único cambio: "sin fila de configuración" ya NO significa "todos los
--   momentos" sino "sólo minus_7". El resto de la lógica —última membresía del
--   cliente, ventana de recuperación, opt-out— queda igual que en 0018.
-- ─────────────────────────────────────────────────────────────────────────────
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
      -- Ventana de recuperación (hueco de agenda), no coincidencia exacta.
      and cm.end_date + o.offset_days between v_from and p_today
      and c.email is not null
      and c.reminders_opt_out = false
      and coalesce(s.enabled, true)
      -- Sin configuración = sólo el aviso de 7 días antes.
      and o.offset_key = any (coalesce(s.offsets_enabled, '{minus_7}'::text[]))
      -- Sólo la ÚLTIMA membresía del cliente avisa: si renovó (o apiló una
      -- vigencia por delante), la anterior deja de mandar nada.
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
  'sólo para la última membresía no cancelada de cada cliente. Sin configuración '
  'de la organización, únicamente el aviso de 7 días antes.';
