-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Encolado de recordatorios (enqueue_due_reminders)                   ║
-- ║                                                                            ║
-- ║ Verifica la lógica de la cola: encola el momento correcto, es idempotente, ║
-- ║ respeta opt-out del cliente, ignora canceladas y honra la config por org   ║
-- ║ (on/off global y por momento). Se ejecuta con `supabase test db`.          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(21);

set local role postgres;

-- Membresías de prueba (Iron Temple), todas con vencimiento 2026-09-01.
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date, status)
select org_id, id, 'Mensual', date '2026-08-02', date '2026-09-01', 'active'
  from public.clients where email = 'juan.perez@example.test';

-- Ana pide NO recibir recordatorios (opt-out).
update public.clients set reminders_opt_out = true where email = 'ana.garcia@example.test';
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date, status)
select org_id, id, 'Mensual', date '2026-08-02', date '2026-09-01', 'active'
  from public.clients where email = 'ana.garcia@example.test';

-- Carlos tiene una membresía CANCELADA (no debe encolar).
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date, status)
select org_id, id, 'Mensual', date '2026-08-02', date '2026-09-01', 'cancelled'
  from public.clients where email = 'carlos.mendez@example.test';

-- ── −7 días (hoy = end_date − 7 = 2026-08-25) ────────────────────────────────
select is(
  public.enqueue_due_reminders(date '2026-08-25'),
  1,
  'A −7 días encola exactamente 1 aviso (sólo Juan; Ana opt-out, Carlos cancelada)'
);

select is(
  (select count(*)::int from public.reminder_outbox ro
     join public.clients c on c.id = ro.client_id
    where ro.offset_key = 'minus_7' and c.email = 'juan.perez@example.test'),
  1,
  'El aviso encolado es minus_7 y pertenece a Juan'
);

select is(
  public.enqueue_due_reminders(date '2026-08-25'),
  0,
  'Idempotente: re-encolar el mismo día no duplica'
);

select is_empty(
  $$ select 1 from public.reminder_outbox ro
       join public.clients c on c.id = ro.client_id
      where c.email = 'ana.garcia@example.test' $$,
  'Cliente con opt-out NO se encola'
);

select is_empty(
  $$ select 1 from public.reminder_outbox ro
       join public.clients c on c.id = ro.client_id
      where c.email = 'carlos.mendez@example.test' $$,
  'Membresía cancelada NO se encola'
);

-- ── Organización deshabilitada ───────────────────────────────────────────────
insert into public.org_reminder_settings (org_id, enabled)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);

select is(
  public.enqueue_due_reminders(date '2026-08-29'),  -- minus_3 de Juan
  0,
  'Con la organización deshabilitada no se encola nada'
);

-- ── Momento no habilitado (sólo minus_7 activo) ──────────────────────────────
update public.org_reminder_settings
   set enabled = true, offsets_enabled = '{minus_7}'
 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  public.enqueue_due_reminders(date '2026-08-29'),  -- minus_3, no habilitado
  0,
  'Un momento fuera de offsets_enabled no se encola'
);

-- ── Momento habilitado de nuevo (day_0 el 2026-09-01) ────────────────────────
update public.org_reminder_settings
   set offsets_enabled = '{minus_7,minus_3,day_0,plus_7,plus_30}'
 where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  public.enqueue_due_reminders(date '2026-09-01'),
  1,
  'El día de vencimiento (day_0) encola 1 aviso'
);

-- ── Ventana de recuperación (hueco de agenda) ────────────────────────────────
-- El plus_7 de Juan cae el 2026-09-08. Con la ventana por defecto (2 días), un
-- barrido del 11 ya no lo alcanza: no se mandan avisos rancios.
select is(
  public.enqueue_due_reminders(date '2026-09-11'),
  0,
  'Un momento de hace 3 días queda fuera de la ventana y no se encola'
);

-- Pero si el job se cayó UN día, el barrido del siguiente sí lo recupera.
select is(
  public.enqueue_due_reminders(date '2026-09-09'),
  1,
  'Un momento del día anterior sí se recupera dentro de la ventana'
);

select is(
  (select ro.due_on from public.reminder_outbox ro
    where ro.offset_key = 'plus_7'),
  date '2026-09-08',
  'due_on guarda la fecha REAL del momento, no el día del barrido'
);

-- ── Renovación: la membresía anterior deja de avisar ─────────────────────────
-- Juan renueva: la nueva vigencia arranca al terminar la anterior (apilado).
insert into public.client_memberships (org_id, client_id, plan_name, start_date, end_date, status)
select org_id, id, 'Mensual', date '2026-09-02', date '2026-10-02', 'active'
  from public.clients where email = 'juan.perez@example.test';

-- El plus_30 de la VIEJA caería justo el 2026-10-01 (ventana 0 para aislarlo).
select is(
  public.enqueue_due_reminders(date '2026-10-01', 0),
  0,
  'Renovó: la membresía anterior ya no dispara su aviso de vencimiento'
);

-- Control: el mismo momento SÍ se dispara para la membresía vigente.
select is(
  public.enqueue_due_reminders(date '2026-11-01', 0),  -- plus_30 de la NUEVA
  1,
  'La última membresía del cliente sí avisa (plus_30 de la nueva)'
);

select is(
  (select cm.end_date from public.reminder_outbox ro
     join public.client_memberships cm on cm.id = ro.client_membership_id
    where ro.offset_key = 'plus_30'),
  date '2026-10-02',
  'El aviso encolado pertenece a la membresía nueva, no a la vieja'
);

-- La renovación anticipada tampoco hace que la vieja avise «vence pronto».
select is(
  public.enqueue_due_reminders(date '2026-08-25', 0),  -- minus_7 de la VIEJA
  0,
  'Con una vigencia apilada por delante, la anterior no avisa vencimiento'
);

-- ── Reintentos con retroceso exponencial ─────────────────────────────────────
-- Se toma un aviso pendiente cualquiera para simular fallos de envío.
create temporary table t_reminder as
  select id from public.reminder_outbox where status = 'pending' limit 1;

select public.mark_reminder_failed((select id from t_reminder), 'SMTP caído');

select is(
  (select ro.status from public.reminder_outbox ro
    where ro.id = (select id from t_reminder)),
  'pending',
  'Un fallo NO descarta el aviso: sigue pendiente para reintentarse'
);

select is(
  (select ro.attempts from public.reminder_outbox ro
    where ro.id = (select id from t_reminder)),
  1,
  'El fallo cuenta como intento'
);

select ok(
  (select ro.next_attempt_at > now() from public.reminder_outbox ro
    where ro.id = (select id from t_reminder)),
  'El reintento queda programado a futuro (retroceso exponencial)'
);

select is(
  (select ro.last_error from public.reminder_outbox ro
    where ro.id = (select id from t_reminder)),
  'SMTP caído',
  'Se guarda el motivo del fallo para diagnosticar'
);

-- Agotar los intentos restantes (max_attempts = 5).
select public.mark_reminder_failed((select id from t_reminder), 'SMTP caído');
select public.mark_reminder_failed((select id from t_reminder), 'SMTP caído');
select public.mark_reminder_failed((select id from t_reminder), 'SMTP caído');
select public.mark_reminder_failed((select id from t_reminder), 'SMTP caído');

select is(
  (select ro.status from public.reminder_outbox ro
    where ro.id = (select id from t_reminder)),
  'failed',
  'Agotados los 5 intentos, el aviso se descarta (buzón failed)'
);

-- Un aviso ya enviado no lo revive un fallo tardío.
select public.mark_reminder_sent((select id from t_reminder));

select is(
  (select ro.status from public.reminder_outbox ro
    where ro.id = (select id from t_reminder)),
  'failed',
  'mark_reminder_sent no revive un aviso ya descartado'
);

select * from finish();
rollback;
