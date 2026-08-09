"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";

export type BranchFormState = { error: string | null; ok?: string | null };

const schema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  address: z.preprocess(emptyToUndefined, z.string().max(400).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().max(40).optional()),
  timezone: z.string().max(60).default("America/Mexico_City"),
  capacity: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().max(100000).optional(),
  ),
  is_active: z.coerce.boolean(),
});

/** Alta o edición de sucursal. La RLS ya exige rol de administrador. */
export async function saveBranch(
  _prev: BranchFormState,
  formData: FormData,
): Promise<BranchFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = schema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    timezone: formData.get("timezone") ?? "America/Mexico_City",
    capacity: formData.get("capacity"),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  const values = {
    name: d.name,
    address: d.address ?? null,
    phone: d.phone ?? null,
    timezone: d.timezone,
    capacity: d.capacity ?? null,
    is_active: d.is_active,
  };

  const { error } = d.id
    ? await supabase.from("branches").update(values).eq("id", d.id)
    : await supabase
        .from("branches")
        .insert({ ...values, org_id: membership.org_id });

  if (error) return { error: message(error.message) };

  revalidatePath("/branches");
  return { error: null, ok: d.id ? "Sucursal actualizada." : "Sucursal creada." };
}

function message(msg: string | undefined): string {
  if (!msg) return "No se pudo guardar la sucursal.";
  if (/row-level security|permission denied/i.test(msg)) {
    return "Sólo un administrador puede administrar sucursales.";
  }
  return /violates|constraint|null value|syntax/i.test(msg)
    ? "No se pudo guardar la sucursal."
    : msg;
}
