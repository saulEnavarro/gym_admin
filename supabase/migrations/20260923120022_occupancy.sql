-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0022 · Fase 3 · Rebanada B · Ocupación y horarios                          ║
-- ║                                                                            ║
-- ║ POR QUÉ SIN REALTIME (se aparta de §6 a propósito, decidido 2026-08-09):    ║
-- ║ marcar entrada y salida ya deja TODO el dato; el tiempo real no aportaría  ║
-- ║ información, sólo frescura sin recargar. Y quien más la necesitaría es      ║
-- ║ justo quien no: recepción CAUSA los cambios, así que su pantalla ya se      ║
-- ║ actualiza al registrar cada acceso; y el socio que consulta «¿qué tan lleno ║
-- ║ está?» decide una vez antes de salir de casa — un dato de hace un minuto le ║
-- ║ sirve igual. A cambio, Realtime cuesta un WebSocket por pestaña abierta y   ║
-- ║ una evaluación de RLS por suscriptor por evento, y las conexiones           ║
-- ║ concurrentes crecen con INQUILINOS, no con uso. Se resuelve con consultas   ║
-- ║ y un refresco por intervalo en la única pantalla que se deja abierta.       ║
-- ║                                                                            ║
-- ║ CÓMO SE MIDE LA OCUPACIÓN: no se cuentan ENTRADAS por hora (eso dice a qué  ║
-- ║ hora llega la gente), sino cuánta gente estuvo DENTRO durante cada hora,    ║
-- ║ que es lo que llena el gimnasio. Cada visita se expande a las horas que     ║
-- ║ cubre —una sola pasada— y se promedia entre los días con actividad.         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- Aforo en este momento.
--   Sin sucursal: se suman las capacidades declaradas de la organización.
--   `capacity` NULL = sin aforo declarado → pct NULL (no se inventa un %).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.occupancy_now(p_branch uuid default null)
returns table (inside integer, capacity integer, pct numeric)
language sql
stable
set search_path = ''
as $$
  with dentro as (
    select count(*)::integer as n
    from public.access_logs a
    where a.exited_at is null
      -- Las visitas que nadie cerró las barre close_stale_visits; este corte
      -- evita que una que se escape infle el aforo del día siguiente.
      and a.entered_at > now() - interval '18 hours'
      and (p_branch is null or a.branch_id = p_branch)
  ),
  aforo as (
    select nullif(sum(b.capacity), 0)::integer as cap
    from public.branches b
    where b.is_active
      and (p_branch is null or b.id = p_branch)
  )
  select d.n,
         a.cap,
         case when a.cap is null or a.cap = 0 then null
              else round(d.n * 100.0 / a.cap, 1) end
  from dentro d cross join aforo a;
$$;

comment on function public.occupancy_now(uuid) is
  'Personas dentro ahora, aforo declarado y porcentaje (NULL si no hay aforo).';

-- ─────────────────────────────────────────────────────────────────────────────
-- Ocupación media por hora del día (hora pico / hora más vacía).
--   Cada visita se expande a las horas que cubrió; se promedia sobre los días
--   CON ACTIVIDAD, no sobre los días del calendario: dividir entre 31 cuando el
--   gimnasio abrió 26 subestimaría la ocupación real.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.occupancy_by_hour(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (hour integer, avg_inside numeric, entries integer)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  ),
  visitas as (
    select a.entered_at, a.exited_at
    from public.access_logs a, bounds b
    where a.entered_at >= b.from_ts
      and a.entered_at <  b.to_ts
      and (p_branch is null or a.branch_id = p_branch)
  ),
  -- Una fila por (visita, hora cubierta). Una visita de 1 h 40 min genera 2.
  ocupadas as (
    select (v.entered_at at time zone p_tz)::date as dia,
           extract(hour from gs)::integer         as hora
    from visitas v
    cross join lateral generate_series(
      date_trunc('hour', v.entered_at at time zone p_tz),
      date_trunc('hour', coalesce(v.exited_at, v.entered_at) at time zone p_tz),
      interval '1 hour'
    ) gs
  ),
  dias as (
    select count(distinct (v.entered_at at time zone p_tz)::date) as n
    from visitas v
  ),
  llegadas as (
    select extract(hour from (v.entered_at at time zone p_tz))::integer as hora,
           count(*)::integer as n
    from visitas v
    group by 1
  ),
  horas as (select generate_series(0, 23) as hora)
  select h.hora,
         case when d.n = 0 then 0
              else round(count(o.hora)::numeric / d.n, 1) end,
         coalesce(max(l.n), 0)
  from horas h
  cross join dias d
  left join ocupadas o on o.hora = h.hora
  left join llegadas l on l.hora = h.hora
  group by h.hora, d.n
  order by h.hora;
$$;

comment on function public.occupancy_by_hour(date, date, uuid, text) is
  'Ocupación media por hora del día (gente DENTRO, no llegadas) y entradas.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Ocupación media por día de la semana y hora: alimenta el mapa de calor del
-- panel y los «horarios recomendados» del portal.
--   isodow: 1 = lunes … 7 = domingo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.occupancy_by_weekday_hour(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (weekday integer, hour integer, avg_inside numeric)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  ),
  visitas as (
    select a.entered_at, a.exited_at
    from public.access_logs a, bounds b
    where a.entered_at >= b.from_ts
      and a.entered_at <  b.to_ts
      and (p_branch is null or a.branch_id = p_branch)
  ),
  ocupadas as (
    select extract(isodow from gs)::integer as weekday,
           extract(hour   from gs)::integer as hour,
           gs::date                         as dia
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
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Resumen de accesos del periodo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.access_summary(
  p_from   date,
  p_to     date,
  p_branch uuid default null,
  p_tz     text default 'America/Mexico_City'
)
returns table (
  visits          integer,
  unique_clients  integer,
  avg_minutes     integer,
  visits_per_day  numeric,
  estimated_pct   numeric,
  authorized      integer
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (p_from::timestamp at time zone p_tz)     as from_ts,
           ((p_to + 1)::timestamp at time zone p_tz) as to_ts
  ),
  v as (
    select a.*
    from public.access_logs a, bounds b
    where a.entered_at >= b.from_ts
      and a.entered_at <  b.to_ts
      and (p_branch is null or a.branch_id = p_branch)
  )
  select
    count(*)::integer,
    count(distinct v.client_id)::integer,
    -- Sólo las salidas REALES promedian bien: las cerradas por el barrido
    -- llevan una duración inventada y ensuciarían el número.
    coalesce(round(avg(
      extract(epoch from (v.exited_at - v.entered_at)) / 60
    ) filter (where v.exited_at is not null and v.exit_method <> 'auto'))::integer, 0),
    round(
      count(*)::numeric / greatest(count(distinct (v.entered_at at time zone p_tz)::date), 1),
      1),
    -- Qué tanto del dato es estimado: si sube mucho, nadie escanea al salir.
    case when count(*) = 0 then 0
         else round(count(*) filter (where v.exit_method = 'auto') * 100.0 / count(*), 1) end,
    count(*) filter (where v.authorized_by is not null)::integer
  from v;
$$;

comment on function public.access_summary(date, date, uuid, text) is
  'Visitas, socios únicos, permanencia media y qué tanto del dato es estimado.';

revoke execute on function public.occupancy_now(uuid)                                  from public, anon;
revoke execute on function public.occupancy_by_hour(date, date, uuid, text)            from public, anon;
revoke execute on function public.occupancy_by_weekday_hour(date, date, uuid, text)    from public, anon;
revoke execute on function public.access_summary(date, date, uuid, text)               from public, anon;

grant execute on function public.occupancy_now(uuid)                                to authenticated;
grant execute on function public.occupancy_by_hour(date, date, uuid, text)          to authenticated;
grant execute on function public.occupancy_by_weekday_hour(date, date, uuid, text)  to authenticated;
grant execute on function public.access_summary(date, date, uuid, text)             to authenticated;
