"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";

export type BrandingFormState = { error: string | null; ok?: string | null };

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
    })
    .eq("org_id", membership.org_id);

  if (error) {
    if (/row-level security|permission denied/i.test(error.message)) {
      return { error: "Sólo un administrador puede cambiar la personalización." };
    }
    return { error: "No se pudieron guardar los cambios." };
  }

  // El nombre y el color se pintan en todo el panel y en el portal del socio.
  revalidatePath("/", "layout");
  return { error: null, ok: "Personalización guardada." };
}
