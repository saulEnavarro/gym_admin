-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0023 · Fase 3 · Red de seguridad de las particiones de access_logs        ║
-- ║                                                                            ║
-- ║ La 0021 crea la partición del mes en curso y de los dos siguientes, y un   ║
-- ║ job mensual va agregando la próxima. El problema es el modo de falla: si   ║
-- ║ una fecha cae fuera de toda partición, el INSERT revienta con «no          ║
-- ║ partition of relation found» — y en esta tabla eso significa que la puerta ║
-- ║ del gimnasio deja de funcionar. Un socio no puede entrar porque falló un   ║
-- ║ cron de mantenimiento: inaceptable.                                        ║
-- ║                                                                            ║
-- ║ Se agrega una partición POR OMISIÓN que recoge lo que no encaje. Con ella  ║
-- ║ el registro de acceso nunca falla; a lo sumo esa fila pierde el beneficio  ║
-- ║ del particionado hasta que se acomode. También aparece al sembrar datos    ║
-- ║ históricos o importar la bitácora de otro sistema, cuyas fechas son        ║
-- ║ anteriores a la instalación.                                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table public.access_logs_default partition of public.access_logs default;

comment on table public.access_logs_default is
  'Recoge accesos cuya fecha no cae en ninguna partición mensual. Debería estar '
  'casi siempre vacía: si crece, es que el job de particiones dejó de correr.';

-- ─────────────────────────────────────────────────────────────────────────────
-- ensure_access_log_partition (v2): tolerante.
--   Crear una partición cuyo rango ya tenga filas en la partición por omisión
--   falla (Postgres tendría que moverlas). Antes eso habría tumbado el job
--   mensual entero; ahora avisa y sigue: las filas quedan en la default, que es
--   degradación, no interrupción.
-- ─────────────────────────────────────────────────────────────────────────────
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
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v_name
  ) then
    return;
  end if;

  execute format(
    'create table public.%I partition of public.access_logs for values from (%L) to (%L)',
    v_name, v_from, v_to
  );
exception when others then
  -- No se interrumpe: la partición por omisión sigue recibiendo esas filas.
  raise notice 'No se pudo crear la partición %: % (las filas van a la default)',
    v_name, sqlerrm;
end;
$$;

-- Particiones de los tres meses anteriores: los reportes miran hacia atrás y
-- así el histórico no se apiña en la partición por omisión desde el día uno.
select public.ensure_access_log_partition((current_date - interval '1 month')::date);
select public.ensure_access_log_partition((current_date - interval '2 months')::date);
select public.ensure_access_log_partition((current_date - interval '3 months')::date);
