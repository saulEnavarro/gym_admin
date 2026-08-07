-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0016 · Fase 2 · Rebanada A · Portal del cliente                             ║
-- ║                                                                            ║
-- ║ · Vincula una ficha de cliente (public.clients) con una cuenta de auth     ║
-- ║   (auth.users) → login del portal. La cuenta se crea vía invitación del    ║
-- ║   staff (service role); aquí sólo se guarda el vínculo user_id.            ║
-- ║ · El cliente del portal NO es org_member (si lo fuera, las políticas       ║
-- ║   "members can read" de 0013 le mostrarían datos de TODA la organización). ║
-- ║   Accede SÓLO a lo suyo mediante políticas RLS auto-acotadas por su ficha.  ║
-- ║ · Barandilla #4: rate-limiting / anti-fuerza bruta del login del portal.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Vínculo ficha ↔ cuenta de portal
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.clients
  add column user_id          uuid references auth.users (id) on delete set null,
  add column portal_invited_at timestamptz;

comment on column public.clients.user_id is
  'Cuenta de auth del portal vinculada a esta ficha (NULL = sin cuenta).';
comment on column public.clients.portal_invited_at is
  'Instante en que el staff envió la invitación al portal.';

-- Una cuenta de auth se vincula a lo sumo a UNA ficha (índice único parcial).
create unique index clients_user_id_key
  on public.clients (user_id)
  where user_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers de identidad del cliente (patrón de 0004: SECURITY DEFINER + search_path
-- vacío + nombres calificados). Sólo consultan la ficha del PROPIO usuario, así
-- que es seguro exponerlas a `authenticated`. Leen clients SIN disparar su RLS
-- (evita recursión con las políticas auto-acotadas de abajo).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.clients c
  where c.user_id = (select auth.uid())
  limit 1;
$$;

comment on function public.current_client_id() is
  'Id de la ficha de cliente vinculada al usuario autenticado (portal), o NULL.';

create or replace function public.current_client_org()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.org_id
  from public.clients c
  where c.user_id = (select auth.uid())
  limit 1;
$$;

comment on function public.current_client_org() is
  'Organización de la ficha vinculada al usuario del portal (para branding).';

revoke execute on function public.current_client_id()  from public, anon;
revoke execute on function public.current_client_org() from public, anon;
grant  execute on function public.current_client_id()  to authenticated;
grant  execute on function public.current_client_org() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Políticas RLS auto-acotadas (SELECT). Se SUMAN a las de staff (0013): un
-- cliente del portal sólo lee SU ficha, SUS membresías, SUS ventas y sus líneas.
-- ─────────────────────────────────────────────────────────────────────────────
create policy "clients: portal client reads own file"
  on public.clients for select to authenticated
  using (id = public.current_client_id());

create policy "client_memberships: portal client reads own"
  on public.client_memberships for select to authenticated
  using (client_id = public.current_client_id());

create policy "sales: portal client reads own"
  on public.sales for select to authenticated
  using (
    client_id = public.current_client_id()
    or partner_client_id = public.current_client_id()
  );

create policy "sale_items: portal client reads own"
  on public.sale_items for select to authenticated
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id
        and (
          s.client_id = public.current_client_id()
          or s.partner_client_id = public.current_client_id()
        )
    )
  );

-- El portal necesita el nombre y branding de su organización, pero el cliente NO
-- es org_member. Se abren SELECT auto-acotados a su propia org.
create policy "organizations: portal client reads own org"
  on public.organizations for select to authenticated
  using (id = public.current_client_org());

create policy "org_branding: portal client reads own org"
  on public.org_branding for select to authenticated
  using (org_id = public.current_client_org());

-- ─────────────────────────────────────────────────────────────────────────────
-- Barandilla #4 · Rate-limiting / anti-fuerza bruta del login del portal.
--   Registro de intentos por (email, ip). La server action del login consulta
--   is_login_locked() ANTES de autenticar y registra el intento después. La
--   tabla queda cerrada por RLS (sin políticas); sólo la tocan las funciones
--   SECURITY DEFINER, invocadas con el service role desde el servidor.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.portal_login_attempts (
  id           bigint generated always as identity primary key,
  email        extensions.citext not null,
  ip           text,
  ok           boolean not null default false,
  attempted_at timestamptz not null default now()
);

comment on table public.portal_login_attempts is
  'Bitácora de intentos de login del portal para rate-limiting (barandilla #4).';

create index portal_login_attempts_lookup_idx
  on public.portal_login_attempts (email, attempted_at desc);

alter table public.portal_login_attempts enable row level security;
-- Sin políticas: nadie accede por API. Sólo las funciones definer de abajo.

-- Parámetros del bloqueo: 5 fallos en 15 minutos → bloqueado.
create or replace function public.is_login_locked(p_email extensions.citext, p_ip text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 5
  from public.portal_login_attempts a
  where a.ok = false
    and a.attempted_at > now() - interval '15 minutes'
    and (a.email = p_email or (p_ip is not null and a.ip = p_ip));
$$;

comment on function public.is_login_locked(extensions.citext, text) is
  'True si (email o ip) acumula ≥5 intentos fallidos en los últimos 15 minutos.';

create or replace function public.register_login_attempt(
  p_email extensions.citext,
  p_ip    text,
  p_ok    boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.portal_login_attempts (email, ip, ok)
  values (p_email, p_ip, p_ok);

  -- Al autenticar con éxito se limpia el historial de fallos de ese email.
  if p_ok then
    delete from public.portal_login_attempts
    where email = p_email and ok = false;
  end if;
end;
$$;

comment on function public.register_login_attempt(extensions.citext, text, boolean) is
  'Registra un intento de login del portal; limpia los fallos si fue exitoso.';

-- Sólo el servidor de confianza (service role) invoca estas funciones.
revoke execute on function public.is_login_locked(extensions.citext, text)              from public, anon, authenticated;
revoke execute on function public.register_login_attempt(extensions.citext, text, boolean) from public, anon, authenticated;
grant  execute on function public.is_login_locked(extensions.citext, text)              to service_role;
grant  execute on function public.register_login_attempt(extensions.citext, text, boolean) to service_role;
