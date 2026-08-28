-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0030 · La foto del establecimiento se ve también en el portal del socio    ║
-- ║                                                                            ║
-- ║ `org_branding.logo_url` ya guardaba la ruta y el bucket 'org-logos' (0008) ║
-- ║ ya existía, pero su política de lectura exige `is_org_member`: el cliente  ║
-- ║ del portal NO es miembro de la organización, así que la URL firmada le     ║
-- ║ salía nula y el encabezado caía al ícono genérico.                         ║
-- ║                                                                            ║
-- ║ Se abre una lectura auto-acotada con el mismo patrón que 0016 usó para     ║
-- ║ `organizations` y `org_branding`: sólo la org a la que pertenece su ficha. ║
-- ║ La escritura sigue reservada al administrador (políticas de 0008).         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create policy "logos: portal client reads own org"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'org-logos'
    and public.storage_object_org(name) = public.current_client_org()
  );
