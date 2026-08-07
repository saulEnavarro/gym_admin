"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { isMinor } from "@/lib/clients/helpers";
import { emptyToUndefined } from "@/lib/forms";
import type {
  ClientInsert,
  ClientUpdate,
  TablesInsert,
} from "@/lib/types/database.types";

const CLIENT_PHOTOS_BUCKET = "client-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ClientFormState = { error: string | null };


const clientSchema = z
  .object({
    first_name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
    last_name: z
      .string()
      .trim()
      .min(1, "Los apellidos son obligatorios")
      .max(120),
    birth_date: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
        .optional(),
    ),
    sex: z.preprocess(
      emptyToUndefined,
      z.enum(["female", "male", "other", "undisclosed"]).optional(),
    ),
    mobile_phone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
    phone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
    email: z.preprocess(
      emptyToUndefined,
      z.string().email("Correo inválido").max(160).optional(),
    ),
    address: z.preprocess(emptyToUndefined, z.string().max(400).optional()),
    emergency_contact_name: z.preprocess(
      emptyToUndefined,
      z.string().max(160).optional(),
    ),
    emergency_contact_phone: z.preprocess(
      emptyToUndefined,
      z.string().max(40).optional(),
    ),
    notes: z.preprocess(emptyToUndefined, z.string().max(2000).optional()),
    branch_id: z.preprocess(
      emptyToUndefined,
      z.string().uuid("Sucursal inválida").optional(),
    ),
    data_consent: z.coerce.boolean(),
    guardian_consent: z.coerce.boolean(),
    guardian_name: z.preprocess(
      emptyToUndefined,
      z.string().max(160).optional(),
    ),
  })
  .refine((d) => d.data_consent, {
    message: "Debes registrar el consentimiento del aviso de privacidad.",
    path: ["data_consent"],
  })
  .refine((d) => !isMinor(d.birth_date) || d.guardian_consent, {
    message: "Para menores de edad se requiere el consentimiento del tutor.",
    path: ["guardian_consent"],
  })
  .refine(
    (d) => !isMinor(d.birth_date) || !d.guardian_consent || !!d.guardian_name,
    {
      message: "Indica el nombre del tutor.",
      path: ["guardian_name"],
    },
  );

function parseForm(formData: FormData) {
  return clientSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    birth_date: formData.get("birth_date"),
    sex: formData.get("sex"),
    mobile_phone: formData.get("mobile_phone"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    emergency_contact_name: formData.get("emergency_contact_name"),
    emergency_contact_phone: formData.get("emergency_contact_phone"),
    notes: formData.get("notes"),
    branch_id: formData.get("branch_id"),
    data_consent: formData.get("data_consent") === "on",
    guardian_consent: formData.get("guardian_consent") === "on",
    guardian_name: formData.get("guardian_name"),
  });
}

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseClient>>;

/**
 * Sube la foto al bucket privado con la ruta {org_id}/{client_id}/... y devuelve
 * su ruta (no URL pública). Devuelve null si no hay foto o si falla la validación.
 */
async function uploadPhoto(
  supabase: SupabaseServer,
  orgId: string,
  clientId: string,
  file: File | null,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("La foto supera el tamaño máximo de 5 MB.");
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Formato de foto no permitido (usa JPG, PNG o WEBP).");
  }
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${orgId}/${clientId}/photo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error("No se pudo subir la foto.");
  return path;
}

/** Alta de cliente. El número consecutivo lo asigna el trigger de BD. */
export async function createClientRecord(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { user, membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  const insert: ClientInsert = {
    org_id: membership.org_id,
    branch_id: d.branch_id ?? null,
    first_name: d.first_name,
    last_name: d.last_name,
    birth_date: d.birth_date ?? null,
    sex: d.sex ?? null,
    mobile_phone: d.mobile_phone ?? null,
    phone: d.phone ?? null,
    email: d.email ?? null,
    address: d.address ?? null,
    emergency_contact_name: d.emergency_contact_name ?? null,
    emergency_contact_phone: d.emergency_contact_phone ?? null,
    notes: d.notes ?? null,
    data_consent_at: new Date().toISOString(),
    guardian_consent: d.guardian_consent,
    guardian_name: d.guardian_name ?? null,
    created_by: user.id,
  };

  // El `as` repone el tipo estricto: `member_number` es NOT NULL en la tabla
  // pero lo asigna el trigger, así que aquí va ausente a propósito.
  const { data: created, error } = await supabase
    .from("clients")
    .insert(insert as TablesInsert<"clients">)
    .select("id")
    .single();

  if (error || !created) {
    return { error: "No se pudo registrar al cliente. Intenta de nuevo." };
  }

  // Foto (opcional): se sube después de tener el id para armar la ruta.
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      const path = await uploadPhoto(
        supabase,
        membership.org_id,
        created.id,
        photo,
      );
      if (path) {
        await supabase
          .from("clients")
          .update({ photo_url: path })
          .eq("id", created.id);
      }
    } catch {
      // El cliente ya quedó registrado; sólo falló la foto: no bloqueamos el alta.
      // (Se puede reintentar la subida desde la edición.)
    }
  }

  revalidatePath("/clients");
  redirect(`/clients/${created.id}`);
}

/** Edición de cliente. */
export async function updateClientRecord(
  id: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  const update: ClientUpdate = {
    org_id: membership.org_id, // RLS igualmente lo restringe
    branch_id: d.branch_id ?? null,
    first_name: d.first_name,
    last_name: d.last_name,
    birth_date: d.birth_date ?? null,
    sex: d.sex ?? null,
    mobile_phone: d.mobile_phone ?? null,
    phone: d.phone ?? null,
    email: d.email ?? null,
    address: d.address ?? null,
    emergency_contact_name: d.emergency_contact_name ?? null,
    emergency_contact_phone: d.emergency_contact_phone ?? null,
    notes: d.notes ?? null,
    guardian_consent: d.guardian_consent,
    guardian_name: d.guardian_name ?? null,
  };

  const photo = formData.get("photo");
  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await uploadPhoto(supabase, membership.org_id, id, photo);
    } catch (e) {
      return {
        error:
          e instanceof Error ? e.message : "No se pudo subir la foto.",
      };
    }
  }

  const { error } = await supabase
    .from("clients")
    .update(photoPath ? { ...update, photo_url: photoPath } : update)
    .eq("id", id);

  if (error) {
    return { error: "No se pudieron guardar los cambios." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

/** Activa o da de baja a un cliente (baja lógica; no borra el historial). */
export async function toggleClientActive(id: string, active: boolean) {
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({ is_active: active })
    .eq("id", id);
  if (error) throw new Error("No se pudo actualizar el estado del cliente.");
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

/** Activa o desactiva los recordatorios por correo de un cliente (opt-out). */
export async function toggleClientReminders(id: string, optOut: boolean) {
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({ reminders_opt_out: optOut })
    .eq("id", id);
  if (error) throw new Error("No se pudo actualizar la preferencia de correos.");
  revalidatePath(`/clients/${id}`);
}
