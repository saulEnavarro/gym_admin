"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

export type SaleFormState = { error: string | null };

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const saleSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente"),
  partner_client_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid().optional(),
  ),
  plan_id: z.string().uuid("Selecciona una membresía"),
  branch_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  payment_method: z.enum(["cash", "card", "transfer"], {
    errorMap: () => ({ message: "Selecciona un método de pago" }),
  }),
  discount_type: z.enum(["none", "amount", "percent"]).default("none"),
  discount_value: z.coerce.number().nonnegative().max(9_999_999).default(0),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
});

/** Registra una venta de membresía (atómica en la BD vía create_membership_sale). */
export async function createSale(
  _prev: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = saleSchema.safeParse({
    client_id: formData.get("client_id"),
    partner_client_id: formData.get("partner_client_id"),
    plan_id: formData.get("plan_id"),
    branch_id: formData.get("branch_id"),
    payment_method: formData.get("payment_method"),
    discount_type: formData.get("discount_type") ?? "none",
    discount_value: formData.get("discount_value") ?? 0,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  const { data: saleId, error } = await supabase.rpc("create_membership_sale", {
    p_client: d.client_id,
    p_partner: d.partner_client_id ?? null,
    p_plan: d.plan_id,
    p_branch: d.branch_id ?? null,
    p_payment_method: d.payment_method,
    p_discount_type: d.discount_type,
    p_discount_value: d.discount_value,
    p_notes: d.notes ?? null,
  });

  if (error || !saleId) {
    return { error: businessMessage(error?.message) };
  }

  revalidatePath("/pos/sales");
  revalidatePath("/clients");
  redirect(`/pos/sales/${saleId}`);
}

/** Cancela una venta y revierte sus membresías (regla de reembolso en la BD). */
export async function cancelSale(id: string, reason: string) {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.rpc("cancel_sale", {
    p_sale: id,
    p_reason: reason || null,
  });
  if (error) {
    throw new Error(businessMessage(error.message));
  }
  revalidatePath("/pos/sales");
  revalidatePath(`/pos/sales/${id}`);
  revalidatePath("/clients");
}

/**
 * Los RAISE de negocio (español) son seguros para el usuario; los errores
 * técnicos de Postgres (RLS, constraints) se reemplazan por un mensaje genérico.
 */
function businessMessage(msg: string | undefined): string {
  if (!msg) return "Ocurrió un error al procesar la venta.";
  const technical =
    /row-level security|violates|constraint|permission denied|null value|invalid input|syntax/i;
  return technical.test(msg) ? "No se pudo procesar la operación." : msg;
}
