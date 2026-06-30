-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0005 · Personalización por organización (branding)                         ║
-- ║                                                                            ║
-- ║ Nombre comercial, logo, color primario, tipografía, moneda, idioma...      ║
-- ║ El color se guarda como HEX (#RRGGBB) y la app lo convierte a HSL para     ║
-- ║ inyectarlo en las variables CSS de tema en tiempo de ejecución.            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
create table public.org_branding (
  org_id         uuid primary key references public.organizations (id) on delete cascade,
  display_name   text,
  logo_url       text,                 -- ruta en Storage (bucket privado), no URL pública
  banner_url     text,
  -- Color primario de marca en HEX. Validado para evitar inyección en CSS.
  primary_color  text not null default '#4f46e5'
                   check (primary_color ~* '^#[0-9a-f]{6}$'),
  font_family    text not null default 'Inter',
  currency       text not null default 'MXN'
                   check (char_length(currency) = 3),
  locale         text not null default 'es-MX',
  timezone       text not null default 'America/Mexico_City',
  contact_email  text,
  contact_phone  text,
  address        text,
  social_links   jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.org_branding is
  'Personalización visual y de configuración regional por organización.';
comment on column public.org_branding.primary_color is
  'Color de marca en HEX (#RRGGBB). La app lo convierte a HSL para las variables CSS.';
comment on column public.org_branding.logo_url is
  'Ruta dentro del bucket privado de Storage; se sirve vía URL firmada, nunca pública.';

create trigger trg_org_branding_updated_at
  before update on public.org_branding
  for each row execute function public.set_updated_at();

-- Al crear una organización, generamos su fila de branding con defaults.
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.org_branding (org_id, display_name)
  values (new.id, new.name)
  on conflict (org_id) do nothing;
  return new;
end;
$$;

create trigger trg_organizations_create_branding
  after insert on public.organizations
  for each row execute function public.handle_new_organization();
