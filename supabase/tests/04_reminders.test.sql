-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Encolado de recordatorios (enqueue_due_reminders)                   ║
-- ║                                                                            ║
-- ║ Verifica la lógica de la cola: encola el momento correcto, es idempotente, ║
-- ║ respeta opt-out del cliente, ignora canceladas y honra la config por org   ║
-- ║ (on/off global y por momento). Se ejecuta con `supabase test db`.          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(8);

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
  public.enqueue_due_reminders(date '2026-09-01'),  -- day_0 de Juan
  1,
  'El día de vencimiento (day_0) encola 1 aviso'
);

select * from finish();
rollback;
