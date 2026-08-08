-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0020 · Fase 2 · Anti-fuerza bruta del portal (barandilla #4, v2)          ║
-- ║                                                                            ║
-- ║ `is_login_locked` de 0016 contaba «fallos del correo O de la IP» contra un ║
-- ║ único umbral de 5. Eso mezcla dos preguntas distintas:                     ║
-- ║                                                                            ║
-- ║   · ¿Alguien está atacando ESTA cuenta?                                    ║
-- ║   · ¿Alguien está rociando contraseñas desde ESTA red?                     ║
-- ║                                                                            ║
-- ║ Con un solo contador, los socios que entran desde el WiFi del gimnasio     ║
-- ║ comparten IP y se bloquean entre sí: cinco dedazos repartidos entre varias ║
-- ║ personas dejaban fuera a todas 15 minutos.                                 ║
-- ║                                                                            ║
-- ║ Se separan las dos señales y se cambia el portazo por una espera:          ║
-- ║                                                                            ║
-- ║ · POR CORREO — retraso progresivo. No hay espera hasta acumular 4 fallos   ║
-- ║   (o sea, cuatro intentos libres); a partir de ahí crece —5 s, 15 s, 45 s, ║
-- ║   2 min— y se borra al acertar. Nadie queda bloqueado del todo, que era la ║
-- ║   queja real, y para un atacante el costo sigue creciendo.                 ║
-- ║   Un intento RECHAZADO por la espera no cuenta como fallo: si contara, el  ║
-- ║   usuario que insiste alargaría su propio castigo sin llegar a probar.     ║
-- ║                                                                            ║
-- ║ · POR IP — se cuentan CUENTAS DISTINTAS, no intentos. Un gimnasio lleno    ║
-- ║   produce muchos fallos, pero repartidos entre pocas personas que se       ║
-- ║   equivocan con SU propio correo; un ataque produce fallos contra MUCHOS   ║
-- ║   correos. Diez cuentas distintas fallidas desde la misma IP en 15 min es  ║
-- ║   una señal que el mostrador de un gimnasio no alcanza ni en día pico.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- El contador por IP agrupa por (ip, ventana): sin este índice haría un
-- recorrido completo de la bitácora en cada intento de login.
create index portal_login_attempts_ip_idx
  on public.portal_login_attempts (ip, attempted_at desc);

drop function if exists public.is_login_locked(extensions.citext, text);

-- ─────────────────────────────────────────────────────────────────────────────
-- login_retry_delay: segundos que faltan para poder intentar de nuevo.
--   0 = adelante. La server action lo consulta ANTES de autenticar.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.login_retry_delay(
  p_email extensions.citext,
  p_ip    text
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fails     integer;
  v_last      timestamptz;
  v_accounts  integer;
  v_ip_last   timestamptz;
  v_step      integer;
  v_wait      integer := 0;
  v_remaining integer;
begin
  -- ── La cuenta ──────────────────────────────────────────────────────────────
  -- Fallos acumulados desde el último acceso correcto: register_login_attempt
  -- los borra al acertar. Envejecen a la hora para que un dedazo de la mañana
  -- no penalice al que vuelve por la tarde.
  select count(*), max(a.attempted_at)
    into v_fails, v_last
  from public.portal_login_attempts a
  where a.ok = false
    and a.email = p_email
    and a.attempted_at > now() - interval '1 hour';

  if v_fails > 3 and v_last is not null then
    v_step := case v_fails
                when 4 then 5
                when 5 then 15
                when 6 then 45
                else 120
              end;
    v_remaining := ceil(
      extract(epoch from (v_last + make_interval(secs => v_step)) - now())
    )::integer;
    v_wait := greatest(v_remaining, 0);
  end if;

  -- ── La red ────────────────────────────────────────────────────────────────
  -- Cuentas DISTINTAS fallidas, no intentos: así una persona terca con su
  -- propio correo nunca arrastra a los demás socios de la misma red.
  if p_ip is not null then
    select count(distinct a.email), max(a.attempted_at)
      into v_accounts, v_ip_last
    from public.portal_login_attempts a
    where a.ok = false
      and a.ip = p_ip
      and a.attempted_at > now() - interval '15 minutes';

    if v_accounts >= 10 and v_ip_last is not null then
      v_remaining := ceil(
        extract(epoch from (v_ip_last + interval '5 minutes') - now())
      )::integer;
      v_wait := greatest(v_wait, v_remaining, 0);
    end if;
  end if;

  return greatest(v_wait, 0);
end;
$$;

comment on function public.login_retry_delay(extensions.citext, text) is
  'Segundos de espera antes del próximo intento de login del portal (0 = adelante). '
  'Retraso progresivo por cuenta; por IP se cuentan cuentas distintas, no intentos.';

-- ─────────────────────────────────────────────────────────────────────────────
-- register_login_attempt: se conserva la firma; sólo se documenta por qué el
-- acierto limpia SÓLO los fallos del correo y no los de la IP.
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- Acertar limpia el historial de ESE correo (el cliente ya demostró ser
  -- quien dice). NO se limpia el de la IP a propósito: si se limpiara, a un
  -- atacante le bastaría entrar a su propia cuenta para reiniciar el contador
  -- de la red y seguir rociando.
  if p_ok then
    delete from public.portal_login_attempts
    where email = p_email and ok = false;
  end if;
end;
$$;

revoke execute on function public.login_retry_delay(extensions.citext, text) from public, anon, authenticated;
grant  execute on function public.login_retry_delay(extensions.citext, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- La bitácora sólo sirve para las ventanas de arriba (1 hora como mucho), así
-- que se purga a diario: si no, crece sin límite y ambos contadores se vuelven
-- más lentos con el tiempo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.purge_login_attempts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.portal_login_attempts
  where attempted_at < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.purge_login_attempts() from public, anon, authenticated;
grant  execute on function public.purge_login_attempts() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-login-attempts-daily',
      '23 4 * * *',
      $cron$ select public.purge_login_attempts(); $cron$
    );
  else
    raise notice 'pg_cron ausente: la purga de intentos queda manual.';
  end if;
exception when others then
  raise notice 'No se pudo agendar purge-login-attempts-daily: %', sqlerrm;
end $$;
