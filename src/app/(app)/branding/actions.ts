"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";
import { ORG_LOGOS_BUCKET } from "@/lib/storage";

export type BrandingFormState = { error: string | null; ok?: string | null };

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const schema = z.object({
  display_name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  primary_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "El color debe ser un HEX como #dc2626"),
  font_family: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  currency: z.string().length(3, "La moneda son 3 letras"),
  locale: z.string().max(10),
  timezone: z.string().max(60),
  contact_email: z.preprocess(
    emptyToUndefined,
    z.string().email("Correo de contacto inválido").max(160).optional(),
  ),
  contact_phone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  address: z.preprocess(emptyToUndefined, z.string().max(400).optional()),
});

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseClient>>;

/**
 * Sube la foto del establecimiento al bucket privado con la ruta obligatoria
 * «{org_id}/...» (es la que usan las políticas de Storage para aislar orgs) y
 * devuelve la ruta, no una URL: se sirve firmada y con caducidad.
 */
async function uploadOrgPhoto(
  supabase: SupabaseServer,
  orgId: string,
  file: File,
): Promise<string> {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("La foto supera el tamaño máximo de 3 MB.");
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Formato de foto no permitido (usa JPG, PNG o WEBP).");
  }
  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${orgId}/establecimiento-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(ORG_LOGOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    if (/row-level security|permission denied|Unauthorized/i.test(error.message)) {
      throw new Error("Sólo un administrador puede cambiar la foto.");
    }
    throw new Error("No se pudo subir la foto del establecimiento.");
  }
  return path;
}

/** Guarda la personalización del gimnasio. La RLS exige rol de administrador. */
export async function saveBranding(
  _prev: BrandingFormState,
  formData: FormData,
): Promise<BrandingFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = schema.safeParse({
    display_name: formData.get("display_name"),
    primary_color: formData.get("primary_color"),
    font_family: formData.get("font_family"),
    currency: formData.get("currency"),
    locale: formData.get("locale"),
    timezone: formData.get("timezone"),
    contact_email: formData.get("contact_email"),
    contact_phone: formData.get("contact_phone"),
    address: formData.get("address"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  // `undefined` = la foto no se toca; `null` = se quita; string = ruta nueva.
  const photo = formData.get("photo");
  let logoPath: string | null | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      logoPath = await uploadOrgPhoto(supabase, membership.org_id, photo);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudo subir la foto." };
    }
  } else if (formData.get("remove_photo") === "on") {
    logoPath = null;
  }

  // Se lee ANTES de escribir para poder borrar el archivo que queda huérfano.
  const { data: current } = await supabase
    .from("org_branding")
    .select("logo_url")
    .eq("org_id", membership.org_id)
    .maybeSingle();

  const { error } = await supabase
    .from("org_branding")
    .update({
      display_name: d.display_name,
      primary_color: d.primary_color,
      font_family: d.font_family ?? "Inter",
      currency: d.currency.toUpperCase(),
      locale: d.locale,
      timezone: d.timezone,
      contact_email: d.contact_email ?? null,
      contact_phone: d.contact_phone ?? null,
      address: d.address ?? null,
      ...(logoPath !== undefined ? { logo_url: logoPath } : {}),
    })
    .eq("org_id", membership.org_id);

  if (error) {
    if (/row-level security|permission denied/i.test(error.message)) {
      return { error: "Sólo un administrador puede cambiar la personalización." };
    }
    return { error: "No se pudieron guardar los cambios." };
  }

  // La foto anterior ya no la referencia nadie. Si el borrado falla no se le
  // dice nada al usuario: su cambio SÍ se guardó, sólo queda un archivo suelto.
  const previous = current?.logo_url;
  if (logoPath !== undefined && previous && previous !== logoPath) {
    await supabase.storage.from(ORG_LOGOS_BUCKET).remove([previous]);
  }

  // El nombre, el color y la foto se pintan en todo el panel y en el portal.
  revalidatePath("/", "layout");
  return { error: null, ok: "Personalización guardada." };
}
