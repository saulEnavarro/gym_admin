-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0008 · Storage privado con aislamiento por organización                    ║
-- ║                                                                            ║
-- ║ Barandilla §5.2: buckets SIEMPRE privados, acceso vía URLs firmadas.       ║
-- ║ Convención de ruta OBLIGATORIA: «{org_id}/...» — el primer segmento de la  ║
-- ║ carpeta es el org_id y las políticas lo usan para aislar inquilinos.       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

insert into storage.buckets (id, name, public)
values
  ('org-logos',     'org-logos',     false),  -- logos y banners de marca
  ('client-photos', 'client-photos', false),  -- fotos de clientes (Fase 1)
  ('documents',     'documents',     false)   -- documentos / consentimientos
on conflict (id) do nothing;

-- Helper local: extrae el org_id (primer segmento de carpeta) de la ruta.
create or replace function public.storage_object_org(object_name text)
returns uuid
language sql
immutable
as $$
  select nullif((storage.foldername(object_name))[1], '')::uuid;
$$;

-- ── org-logos: lectura por miembros, escritura por admin ─────────────────────
create policy "logos: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_member(public.storage_object_org(name))
  );

create policy "logos: admin write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and public.is_org_admin(public.storage_object_org(name))
  );

create policy "logos: admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_admin(public.storage_object_org(name))
  );

create policy "logos: admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and public.is_org_admin(public.storage_object_org(name))
  );

-- ── client-photos y documents: acceso por miembros de la org ─────────────────
-- (En Fase 1 se afinará por rol y sucursal.)
create policy "private files: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('client-photos', 'documents')
    and public.is_org_member(public.storage_object_org(name))
  );

create policy "private files: members write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('client-photos', 'documents')
    and public.is_org_member(public.storage_object_org(name))
  );

create policy "private files: members update"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('client-photos', 'documents')
    and public.is_org_member(public.storage_object_org(name))
  );

create policy "private files: members delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('client-photos', 'documents')
    and public.is_org_member(public.storage_object_org(name))
  );
