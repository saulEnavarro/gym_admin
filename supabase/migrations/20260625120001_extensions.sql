-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0001 · Extensiones y utilidades base                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Extensiones en su propio esquema para no contaminar `public`.
create schema if not exists extensions;

-- pgcrypto: gen_random_uuid() y utilidades criptográficas.
create extension if not exists "pgcrypto" with schema extensions;
-- citext: comparación case-insensitive (emails, slugs).
create extension if not exists "citext" with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger reutilizable: mantiene `updated_at` al día en cada UPDATE.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: refresca la columna updated_at con now().';
