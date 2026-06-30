-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0006 · Logs de auditoría                                                   ║
-- ║                                                                            ║
-- ║ Registro append-only de acciones sensibles. Una función trigger genérica   ║
-- ║ se engancha a las tablas que se quieran auditar (captura old/new + actor). ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  org_id      uuid references public.organizations (id) on delete set null,
  branch_id   uuid references public.branches (id) on delete set null,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,            -- INSERT | UPDATE | DELETE | acción de negocio
  entity      text not null,            -- nombre de tabla o recurso lógico
  entity_id   text,                     -- id afectado (texto: soporta uuid/bigint)
  old_data    jsonb,
  new_data    jsonb,
  ip_address  inet,
  created_at  timestamptz not null default now()
);

comment on table public.audit_logs is
  'Bitácora append-only de acciones sensibles (barandilla de auditoría, §4).';

create index audit_logs_org_id_created_idx on public.audit_logs (org_id, created_at desc);
create index audit_logs_actor_idx          on public.audit_logs (actor_id);
create index audit_logs_entity_idx         on public.audit_logs (entity, entity_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Función trigger genérica de auditoría.
-- Espera que la tabla auditada tenga una columna `org_id` (uuid). Si además
-- tiene `branch_id`, se captura. Se engancha así:
--
--   create trigger trg_audit_<tabla>
--     after insert or update or delete on public.<tabla>
--     for each row execute function public.audit_row();
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old   jsonb := null;
  v_new   jsonb := null;
  v_org   uuid;
  v_branch uuid;
  v_entity_id text;
begin
  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old);
  elsif (tg_op = 'INSERT') then
    v_new := to_jsonb(new);
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
  end if;

  -- org_id / branch_id desde la fila nueva o vieja, de forma tolerante.
  -- La tabla organizations no tiene columna org_id: su propio id ES el org.
  v_org := coalesce(
    (v_new ->> 'org_id')::uuid,
    (v_old ->> 'org_id')::uuid,
    case when tg_table_name = 'organizations'
         then coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid)
    end
  );
  v_branch := coalesce((v_new ->> 'branch_id')::uuid, (v_old ->> 'branch_id')::uuid);
  v_entity_id := coalesce(v_new ->> 'id', v_old ->> 'id');

  insert into public.audit_logs
    (org_id, branch_id, actor_id, action, entity, entity_id, old_data, new_data)
  values
    (v_org, v_branch, (select auth.uid()), tg_op, tg_table_name, v_entity_id, v_old, v_new);

  return coalesce(new, old);
end;
$$;

comment on function public.audit_row() is
  'Trigger AFTER I/U/D: registra cambios en audit_logs. Requiere columna org_id.';

-- Auditamos desde ya las tablas sensibles de Fase 0.
create trigger trg_audit_organizations
  after insert or update or delete on public.organizations
  for each row execute function public.audit_row();

create trigger trg_audit_branches
  after insert or update or delete on public.branches
  for each row execute function public.audit_row();

create trigger trg_audit_org_members
  after insert or update or delete on public.org_members
  for each row execute function public.audit_row();

create trigger trg_audit_org_branding
  after insert or update or delete on public.org_branding
  for each row execute function public.audit_row();
