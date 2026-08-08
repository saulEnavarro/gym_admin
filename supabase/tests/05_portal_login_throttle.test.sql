-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ TEST · Anti-fuerza bruta del portal (login_retry_delay)                    ║
-- ║                                                                            ║
-- ║ Lo que de verdad hay que demostrar es la separación de las dos señales:    ║
-- ║ una persona terca con SU propio correo no debe arrastrar a los demás       ║
-- ║ socios que comparten el WiFi del gimnasio, mientras que un ataque contra   ║
-- ║ muchas cuentas desde esa misma IP sí tiene que frenarse.                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
begin;
select plan(10);

set local role postgres;

-- ── Cuenta limpia ────────────────────────────────────────────────────────────
select is(
  public.login_retry_delay('nadie@example.test', '10.0.0.1'),
  0,
  'Sin fallos previos no hay espera'
);

-- ── Retraso progresivo por cuenta ────────────────────────────────────────────
-- Los primeros tres intentos son libres: un dedazo no debe costar nada.
select public.register_login_attempt('juan.perez@example.test', '10.0.0.1', false);
select public.register_login_attempt('juan.perez@example.test', '10.0.0.1', false);
select public.register_login_attempt('juan.perez@example.test', '10.0.0.1', false);

select is(
  public.login_retry_delay('juan.perez@example.test', '10.0.0.1'),
  0,
  'Tres fallos todavía no imponen espera'
);

select public.register_login_attempt('juan.perez@example.test', '10.0.0.1', false);

select ok(
  public.login_retry_delay('juan.perez@example.test', '10.0.0.1') between 1 and 5,
  'El cuarto fallo impone una espera corta (≈5 s)'
);

-- Cada fallo adicional alarga la espera.
select public.register_login_attempt('juan.perez@example.test', '10.0.0.1', false);

select ok(
  public.login_retry_delay('juan.perez@example.test', '10.0.0.1') between 6 and 15,
  'El quinto fallo alarga la espera (≈15 s)'
);

-- ── El acierto limpia el historial de la cuenta ──────────────────────────────
select public.register_login_attempt('juan.perez@example.test', '10.0.0.1', true);

select is(
  public.login_retry_delay('juan.perez@example.test', '10.0.0.1'),
  0,
  'Entrar bien borra los fallos: el cliente deja de esperar'
);

-- ── El caso del gimnasio: una persona terca NO bloquea a su red ──────────────
-- Doce fallos, pero todos del MISMO correo desde la IP compartida.
do $$
begin
  for i in 1..12 loop
    perform public.register_login_attempt('carlos.mendez@example.test', '200.1.1.1', false);
  end loop;
end $$;

select ok(
  public.login_retry_delay('carlos.mendez@example.test', '200.1.1.1') > 0,
  'Quien falla muchas veces sí acumula espera en SU cuenta'
);

select is(
  public.login_retry_delay('sofia.ramirez@example.test', '200.1.1.1'),
  0,
  'Un compañero de la misma red NO hereda esa espera (el caso del WiFi)'
);

-- ── Nueve cuentas distintas: todavía no es señal de ataque ───────────────────
do $$
begin
  for i in 1..9 loop
    perform public.register_login_attempt(
      ('spray' || i || '@example.test')::extensions.citext, '203.0.113.9', false);
  end loop;
end $$;

select is(
  public.login_retry_delay('inocente@example.test', '203.0.113.9'),
  0,
  'Nueve cuentas distintas desde una IP aún no frenan a un tercero'
);

-- ── Diez cuentas distintas: password-spray, se frena la red ──────────────────
select public.register_login_attempt('spray10@example.test', '203.0.113.9', false);

select ok(
  public.login_retry_delay('inocente@example.test', '203.0.113.9') > 0,
  'Diez cuentas distintas desde una IP sí frenan a esa red completa'
);

-- El freno es de la red, no del correo: la misma cuenta desde otra IP entra.
select is(
  public.login_retry_delay('inocente@example.test', '10.0.0.99'),
  0,
  'Ese freno es de la IP: la misma cuenta desde otra red no espera'
);

select * from finish();
rollback;
