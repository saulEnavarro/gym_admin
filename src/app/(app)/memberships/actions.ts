"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import type { MembershipPlanInsert } from "@/lib/types/database.types";

export type PlanFormState = { error: string | null };

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const planSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  description: z.preprocess(
    emptyToUndefined,
    z.string().max(500).optional(),
  ),
  // price = base SIN IVA. Aceptamos hasta 2 decimales, no negativo.
  price: z.coerce
    .number({ invalid_type_error: "El precio debe ser un número" })
    .nonnegative("El precio no puede ser negativo")
    .max(9_999_999, "Precio fuera de rango"),
  duration_days: z.coerce
    .number({ invalid_type_error: "La vigencia debe ser un número" })
    .int("La vigencia debe ser un entero de días")
    .min(1, "La vigencia mínima es 1 día")
    .max(3650, "Vigencia fuera de rango"),
  max_members: z.coerce
    .number({ invalid_type_error: "El número de personas debe ser un número" })
    .int()
    .min(1)
    .max(10),
  is_active: z.coerce.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

function parseForm(formData: FormData) {
  return planSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    duration_days: formData.get("duration_days"),
    max_members: formData.get("max_members"),
    is_active: formData.get("is_active") === "on",
    sort_order: formData.get("sort_order") ?? 0,
  });
}

/** Alta de un plan de membresía. */
export async function createPlan(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  const insert: MembershipPlanInsert = {
    org_id: membership.org_id,
    name: d.name,
    description: d.description ?? null,
    price: d.price,
    duration_days: d.duration_days,
    max_members: d.max_members,
    is_active: d.is_active,
    sort_order: d.sort_order,
  };

  const { error } = await supabase.from("membership_plans").insert(insert);
  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe una membresía con ese nombre." };
    }
    return { error: "No se pudo crear la membresía. Intenta de nuevo." };
  }

  revalidatePath("/memberships");
  redirect("/memberships");
}

/** Edición de un plan de membresía. */
export async function updatePlan(
  id: string,
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("membership_plans")
    .update({
      name: d.name,
      description: d.description ?? null,
      price: d.price,
      duration_days: d.duration_days,
      max_members: d.max_members,
      is_active: d.is_active,
      sort_order: d.sort_order,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe una membresía con ese nombre." };
    }
    return { error: "No se pudieron guardar los cambios." };
  }

  revalidatePath("/memberships");
  redirect("/memberships");
}

/** Activa/desactiva un plan sin borrarlo (preserva referencias de ventas). */
export async function togglePlanActive(id: string, active: boolean) {
  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("membership_plans")
    .update({ is_active: active })
    .eq("id", id);
  if (error) throw new Error("No se pudo actualizar el estado de la membresía.");
  revalidatePath("/memberships");
}
