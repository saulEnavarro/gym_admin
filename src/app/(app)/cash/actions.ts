"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";
import type { RpcArgs, RpcArgsNullable } from "@/lib/types/database.types";

export type CashFormState = { error: string | null };

const openSchema = z.object({
  branch_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  opening_float: z.coerce
    .number()
    .nonnegative("El fondo inicial no puede ser negativo")
    .max(9_999_999),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
});

const closeSchema = z.object({
  session_id: z.string().uuid(),
  counted_cash: z.coerce
    .number()
    .nonnegative("El efectivo contado no puede ser negativo")
    .max(9_999_999),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
});

const movementSchema = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.enum([
    "supplier",
    "payroll",
    "withdrawal",
    "deposit",
    "adjustment",
    "other",
  ]),
  payment_method: z.enum(["cash", "card", "transfer"]).default("cash"),
  amount: z.coerce
    .number()
    .positive("El monto debe ser mayor a cero")
    .max(9_999_999),
  description: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
});

/** Abre el turno de caja del cajero con su fondo inicial. */
export async function openCashSession(
  _prev: CashFormState,
  formData: FormData,
): Promise<CashFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = openSchema.safeParse({
    branch_id: formData.get("branch_id"),
    opening_float: formData.get("opening_float") ?? 0,
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createSupabaseClient();
  const args: RpcArgsNullable<"open_cash_session", "p_branch" | "p_notes"> = {
    p_branch: parsed.data.branch_id ?? null,
    p_opening_float: parsed.data.opening_float,
    p_notes: parsed.data.notes ?? null,
  };

  const { error } = await supabase.rpc(
    "open_cash_session",
    args as RpcArgs<"open_cash_session">,
  );
  if (error) return { error: businessMessage(error.message) };

  revalidatePath("/cash");
  revalidatePath("/pos");
  return { error: null };
}

/** Cierra el turno con el efectivo contado; la BD congela el arqueo. */
export async function closeCashSession(
  _prev: CashFormState,
  formData: FormData,
): Promise<CashFormState> {
  await requireSession();

  const parsed = closeSchema.safeParse({
    session_id: formData.get("session_id"),
    counted_cash: formData.get("counted_cash"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Captura el efectivo contado.",
    };
  }

  const supabase = await createSupabaseClient();
  const args: RpcArgsNullable<"close_cash_session", "p_notes"> = {
    p_session: parsed.data.session_id,
    p_counted_cash: parsed.data.counted_cash,
    p_notes: parsed.data.notes ?? null,
  };

  const { error } = await supabase.rpc(
    "close_cash_session",
    args as RpcArgs<"close_cash_session">,
  );
  if (error) return { error: businessMessage(error.message) };

  revalidatePath("/cash");
  revalidatePath("/cash/sessions");
  revalidatePath("/pos");
  return { error: null };
}

/** Registra un ingreso o egreso manual en el turno abierto. */
export async function registerCashMovement(
  _prev: CashFormState,
  formData: FormData,
): Promise<CashFormState> {
  await requireSession();

  const parsed = movementSchema.safeParse({
    kind: formData.get("kind"),
    category: formData.get("category"),
    payment_method: formData.get("payment_method") ?? "cash",
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createSupabaseClient();
  const args: RpcArgsNullable<"register_cash_movement", "p_description"> = {
    p_kind: parsed.data.kind,
    p_category: parsed.data.category,
    p_amount: parsed.data.amount,
    p_payment_method: parsed.data.payment_method,
    p_description: parsed.data.description ?? null,
  };

  const { error } = await supabase.rpc(
    "register_cash_movement",
    args as RpcArgs<"register_cash_movement">,
  );
  if (error) return { error: businessMessage(error.message) };

  revalidatePath("/cash");
  return { error: null };
}

/**
 * Los RAISE de negocio (en español) son seguros para el usuario; los errores
 * técnicos de Postgres (RLS, constraints) se reemplazan por un genérico.
 */
function businessMessage(msg: string | undefined): string {
  if (!msg) return "Ocurrió un error al operar la caja.";
  const technical =
    /row-level security|violates|constraint|permission denied|null value|invalid input|syntax|duplicate key/i;
  return technical.test(msg) ? "No se pudo procesar la operación." : msg;
}
