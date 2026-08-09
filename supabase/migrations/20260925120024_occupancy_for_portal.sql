-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0024 · Fase 3 · Ocupación visible para el socio del portal                 ║
-- ║                                                                            ║
-- ║ Las funciones de 0022 son SECURITY INVOKER, así que agregan bajo la RLS de ║
-- ║ quien pregunta. Para el staff está bien. Para el socio del portal NO: su   ║
-- ║ política sobre access_logs es «sólo mis propios accesos», de modo que el    ║
-- ║ «¿qué tan lleno está?» le contaba únicamente SU visita —decía 1 cuando      ║
-- ║ había 3— y como tampoco puede leer `branches`, el aforo salía nulo.        ║
-- ║                                                                            ║
-- ║ La solución no es abrirle access_logs: un socio no tiene por qué saber     ║
-- ║ QUIÉN está en el gimnasio. Un CONTEO, en cambio, no identifica a nadie. Se ║
-- ║ pasan a SECURITY DEFINER las dos funciones que consume el portal, con el   ║
-- ║ alcance de organización resuelto y comprobado dentro: staff por su          ║
-- ║ membresía, socio por su ficha. Sigue sin poder pedir datos de otra org.    ║
-- ║                                                                            ║
-- ║ occupancy_by_hour y access_summary se quedan como estaban: sólo las usa el ║
-- ║ panel de staff, y ahí la RLS ya da la respuesta correcta.                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Organización de quien pregunta: staff por su membresía, socio del portal por
 * su ficha. NULL si no es ninguna de las dos.
 */
create or replace function public.current_scope_org()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select o from public.current_user_org_ids() o limit 1),
    public.current_client_org()
  );
$$;

revoke execute on function public.current_scope_org() from public, anon;
grant  execute on function public.current_scope_org() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- occupancy_now (v2): SECURITY DEFINER con alcance explícito.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.occupancy_now(p_branch uuid default null)
returns table (inside integer, capacity integer, pct numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.current_scope_org();
begin
  if v_org is null then
    return;  -- sin organización a la que pertenecer, no hay nada que contar
  end if;

  -- Una sucursal de otra organización no se puede consultar ni por accidente.
  if p_branch is not null and not exists (
    select 1 from public.branches b where b.id = p_branch and b.org_id = v_org
  ) then
    return;
  end if;

  return query
  with dentro as (
    select count(*)::integer as n
    from public.access_logs a
    where a.org_id = v_org
      and a.exited_at is null
      -- Las visitas que nadie cerró las barre close_stale_visits; este corte
      -- evita que una que se escape infle el aforo del día siguiente.
      and a.entered_at > now() - interval '18 hours'
      and (p_branch is null or a.branch_id = p_branch)
  ),
  aforo as (
    select nullif(sum(b.capacity), 0)::integer as cap
    from public.branches b
    where b.org_id = v_org
      and b.is_active
      and (p_branch is null or b.id = p_branch)
  )
  select d.n,
         a.cap,
         case when a.cap is null or a.cap = 0 then null
              else round(d.n * 100.0 / a.cap, 1) end
  from dentro d cross join aforo a;
end;
$$;

comment on function public.occupancy_now(uuid) is
  'Personas dentro ahora, aforo y porcentaje. SECURITY DEFINER: el socio del '
  'portal ve el CONTEO de su gimnasio sin poder ver quién está dentro.';

-- ─────────────────────────────────────────────────────────────────────────────
-- occupancy_by_weekday_hour (v2): idem. Alimenta los horarios recomendados.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.occupancy_by_weekday_hour(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (weekday integer, hour integer, avg_inside numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.current_scope_org();
begin
  if v_org is null then
    return;
  end if;

  if p_branch is not null and not exists (
    select 1 from public.branches b where b.id = p_branch and b.org_id = v_org
  ) then
    return;
  end if;

  return query
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  ),
  visitas as (
    select a.entered_at, a.exited_at
    from public.access_logs a, bounds b
    where a.org_id = v_org
      and a.entered_at >= b.from_ts
      and a.entered_at <  b.to_ts
      and (p_branch is null or a.branch_id = p_branch)
  ),
  ocupadas as (
    select extract(isodow from gs)::integer as weekday,
           extract(hour   from gs)::integer as hour
    from visitas v
    cross join lateral generate_series(
      date_trunc('hour', v.entered_at at time zone p_tz),
      date_trunc('hour', coalesce(v.exited_at, v.entered_at) at time zone p_tz),
      interval '1 hour'
    ) gs
  ),
  -- Cuántas veces ocurrió cada día de la semana dentro del rango, para promediar
  -- (cuatro lunes no se comparan contra cinco martes).
  ocurrencias as (
    select extract(isodow from d)::integer as weekday, count(*)::numeric as n
    from generate_series(p_from, p_to, interval '1 day') d
    group by 1
  )
  select oc.weekday,
         oc.hour,
         round(count(*)::numeric / greatest(occ.n, 1), 1)
  from ocupadas oc
  join ocurrencias occ on occ.weekday = oc.weekday
  group by oc.weekday, oc.hour, occ.n
  order by oc.weekday, oc.hour;
end;
$$;

comment on function public.occupancy_by_weekday_hour(date, date, uuid, text) is
  'Ocupación media por día de la semana y hora. SECURITY DEFINER para que el '
  'portal pueda recomendarle horarios al socio sin abrirle la bitácora.';
