-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0011 · Fase 1 · Grants de tabla para los roles de PostgREST                ║
-- ║                                                                            ║
-- ║ RLS filtra FILAS, pero PostgreSQL exige además el privilegio de TABLA:     ║
-- ║ sin GRANT, el rol `authenticated` recibe «permission denied» aunque haya   ║
-- ║ políticas. Aquí concedemos el DML a `authenticated` y `service_role`; la    ║
-- ║ REJA real sigue siendo RLS (una tabla sin política de INSERT/UPDATE/DELETE ║
-- ║ los sigue bloqueando aunque el GRANT exista).                              ║
-- ║                                                                            ║
-- ║ NB: NO tocamos funciones (routines). Los helpers SECURITY DEFINER ya       ║
-- ║ tienen grants explícitos y fueron REVOCADOS de `anon` a propósito (0004);  ║
-- ║ un `grant on all routines` los volvería a exponer. NO concedemos nada a    ║
-- ║ `anon`: el staff opera siempre autenticado.                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

grant usage on schema public to authenticated, service_role;

-- Tablas existentes.
grant select, insert, update, delete
  on all tables in schema public
  to authenticated, service_role;

-- Secuencias (p. ej. identity de audit_logs) para permitir los INSERT.
grant usage, select
  on all sequences in schema public
  to authenticated, service_role;

-- Tablas y secuencias futuras heredan los mismos privilegios.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
