"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";
import type { RpcArgs, RpcArgsNullable } from "@/lib/types/database.types";

export type RentalFormState = { error: string | null; ok?: string | null };

const rentSchema = z.object({
  product_id: z.string().uuid("Elige un artículo"),
  client_id: z.string().uuid("Elige al socio"),
  branch_id: z.string().uuid("Elige una sucursal"),
  quantity: z.coerce.number().int().positive().max(99),
  due_hours: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().max(720).optional(),
  ),
  notes: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
});

/** Presta un artículo a un socio y lo descuenta del anaquel. */
export async function rentProduct(
  _prev: RentalFormState,
  formData: FormData,
): Promise<RentalFormState> {
  await requireSession();

  const parsed = rentSchema.safeParse({
    product_id: formData.get("product_id"),
    client_id: formData.get("client_id"),
    branch_id: formData.get("branch_id"),
    quantity: formData.get("quantity") ?? 1,
    due_hours: formData.get("due_hours"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  const supabase = await createSupabaseClient();
  const args: RpcArgsNullable<"rent_product", "p_due_hours" | "p_notes"> = {
    p_product: d.product_id,
    p_client: d.client_id,
    p_branch: d.branch_id,
    p_quantity: d.quantity,
    p_due_hours: d.due_hours ?? null,
    p_notes: d.notes ?? null,
  };

  const { error } = await supabase.rpc(
    "rent_product",
    args as RpcArgs<"rent_product">,
  );
  if (error) return { error: businessMessage(error.message) };

  revalidatePath("/rentals");
  revalidatePath("/inventory");
  return { error: null, ok: "Préstamo registrado." };
}

/** Cierra un préstamo: devuelto al anaquel, o dado por perdido (merma). */
export async function closeRental(
  rentalId: string,
  lost: boolean,
  notes: string,
): Promise<RentalFormState> {
  await requireSession();
  const supabase = await createSupabaseClient();

  const args: RpcArgsNullable<"return_rental", "p_notes"> = {
    p_rental: rentalId,
    p_lost: lost,
    p_notes: notes || null,
  };
  const { error } = await supabase.rpc(
    "return_rental",
    args as RpcArgs<"return_rental">,
  );
  if (error) return { error: businessMessage(error.message) };

  revalidatePath("/rentals");
  revalidatePath("/inventory");
  return { error: null };
}

function businessMessage(msg: string | undefined): string {
  if (!msg) return "No se pudo completar la operación.";
  const technical =
    /row-level security|violates|constraint|permission denied|null value|invalid input|syntax/i;
  return technical.test(msg) ? "No se pudo completar la operación." : msg;
}
