"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";
import type { RpcArgs, RpcArgsNullable } from "@/lib/types/database.types";

export type SaleFormState = { error: string | null };

/** Una línea del carrito de productos. */
const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(9999),
});

const saleSchema = z.object({
  // Sin socio se puede vender: un ticket de sólo productos es para público
  // general. La membresía sí lo exige, y eso lo valida la base.
  client_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  partner_client_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid().optional(),
  ),
  plan_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  items: z
    .string()
    .optional()
    .transform((raw) => {
      if (!raw) return [] as { product_id: string; quantity: number }[];
      try {
        return z.array(cartItemSchema).parse(JSON.parse(raw));
      } catch {
        return [] as { product_id: string; quantity: number }[];
      }
    }),
  payment_method: z.enum(["cash", "card", "transfer"], {
    errorMap: () => ({ message: "Selecciona un método de pago" }),
  }),
  discount_type: z.enum(["none", "amount", "percent"]).default("none"),
  discount_value: z.coerce.number().nonnegative().max(9_999_999).default(0),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
});

/** Registra una venta (membresía y/o productos), atómica en la BD. */
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
    items: formData.get("items") ?? undefined,
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

  if (!d.plan_id && d.items.length === 0) {
    return { error: "Agrega una membresía o algún producto al ticket." };
  }

  // La sucursal y el turno los toma la BD del turno de caja abierto del cajero.
  const args: RpcArgsNullable<
    "create_sale",
    "p_client" | "p_partner" | "p_plan" | "p_notes"
  > = {
    p_client: d.client_id ?? null,
    p_partner: d.partner_client_id ?? null,
    p_plan: d.plan_id ?? null,
    p_items: d.items,
    p_payment_method: d.payment_method,
    p_discount_type: d.discount_type,
    p_discount_value: d.discount_value,
    p_notes: d.notes ?? null,
  };

  const { data: saleId, error } = await supabase.rpc(
    "create_sale",
    args as RpcArgs<"create_sale">,
  );

  if (error || !saleId) {
    return { error: businessMessage(error?.message) };
  }

  revalidatePath("/pos/sales");
  revalidatePath("/clients");
  revalidatePath("/cash");
  revalidatePath("/inventory");
  redirect(`/pos/sales/${saleId}`);
}

/** Cancela UNA línea del ticket (el folio y el resto del ticket se conservan). */
export async function cancelSaleItem(
  saleId: string,
  itemId: string,
  reason: string,
): Promise<SaleFormState> {
  const supabase = await createSupabaseClient();
  const args: RpcArgsNullable<"cancel_sale_item", "p_reason"> = {
    p_item: itemId,
    p_reason: reason || null,
  };
  const { error } = await supabase.rpc(
    "cancel_sale_item",
    args as RpcArgs<"cancel_sale_item">,
  );
  if (error) return { error: businessMessage(error.message) };

  revalidatePath(`/pos/sales/${saleId}`);
  revalidatePath("/pos/sales");
  revalidatePath("/cash");
  revalidatePath("/inventory");
  revalidatePath("/clients");
  return { error: null };
}

/**
 * Cancela el ticket completo, que en la base equivale a cancelar todas sus
 * líneas una por una (mismo camino que la cancelación individual).
 *
 * Devuelve el error en vez de lanzarlo: Next.js redacta los mensajes de las
 * Server Actions que lanzan cuando corre en producción, y aquí el mensaje —
 * «Abre tu turno de caja…», «Sólo un administrador puede…» — es justo lo que
 * el cajero necesita leer.
 */
export async function cancelSale(
  id: string,
  reason: string,
): Promise<SaleFormState> {
  const supabase = await createSupabaseClient();
  const args: RpcArgsNullable<"cancel_sale", "p_reason"> = {
    p_sale: id,
    p_reason: reason || null,
  };
  const { error } = await supabase.rpc(
    "cancel_sale",
    args as RpcArgs<"cancel_sale">,
  );
  if (error) {
    return { error: businessMessage(error.message) };
  }
  revalidatePath("/pos/sales");
  revalidatePath(`/pos/sales/${id}`);
  revalidatePath("/clients");
  revalidatePath("/cash");
  revalidatePath("/inventory");
  return { error: null };
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
