"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";
import type { ProductInsert, RpcArgs, RpcArgsNullable } from "@/lib/types/database.types";

export type ProductFormState = { error: string | null };
export type StockFormState = { error: string | null; ok?: string | null };

const productSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(160),
  category_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  description: z.preprocess(emptyToUndefined, z.string().max(600).optional()),
  sku: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  barcode: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  // Ambos SIN IVA, igual que las membresías (§7).
  cost: z.coerce.number().nonnegative("El costo no puede ser negativo").max(9_999_999),
  price: z.coerce.number().nonnegative("El precio no puede ser negativo").max(9_999_999),
  track_stock: z.coerce.boolean(),
  is_active: z.coerce.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode"),
    cost: formData.get("cost") ?? 0,
    price: formData.get("price") ?? 0,
    track_stock: formData.get("track_stock") === "on",
    is_active: formData.get("is_active") === "on",
    sort_order: formData.get("sort_order") ?? 0,
  });
}

/** Alta de producto en el catálogo. */
export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = parseProduct(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  const insert: ProductInsert = {
    org_id: membership.org_id,
    category_id: d.category_id ?? null,
    name: d.name,
    description: d.description ?? null,
    sku: d.sku ?? null,
    barcode: d.barcode ?? null,
    cost: d.cost,
    price: d.price,
    track_stock: d.track_stock,
    is_active: d.is_active,
    sort_order: d.sort_order,
  };

  const { data: created, error } = await supabase
    .from("products")
    .insert(insert)
    .select("id")
    .single();

  if (error || !created) return { error: productError(error?.message) };

  revalidatePath("/inventory");
  redirect(`/inventory/${created.id}`);
}

/** Edición de producto. */
export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireSession();
  const parsed = parseProduct(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  const { error } = await supabase
    .from("products")
    .update({
      category_id: d.category_id ?? null,
      name: d.name,
      description: d.description ?? null,
      sku: d.sku ?? null,
      barcode: d.barcode ?? null,
      cost: d.cost,
      price: d.price,
      track_stock: d.track_stock,
      is_active: d.is_active,
      sort_order: d.sort_order,
    })
    .eq("id", id);

  if (error) return { error: productError(error.message) };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  redirect(`/inventory/${id}`);
}

const movementSchema = z.object({
  product_id: z.string().uuid(),
  branch_id: z.string().uuid("Elige una sucursal"),
  kind: z.enum(["purchase", "loss", "adjustment"]),
  quantity: z.coerce
    .number()
    .int("Captura piezas enteras")
    .min(0)
    .max(1_000_000),
  unit_cost: z.preprocess(
    emptyToUndefined,
    z.coerce.number().nonnegative().max(9_999_999).optional(),
  ),
  notes: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
});

/** Movimiento manual de inventario (entrada, merma o ajuste por conteo). */
export async function registerMovement(
  _prev: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  await requireSession();

  const parsed = movementSchema.safeParse({
    product_id: formData.get("product_id"),
    branch_id: formData.get("branch_id"),
    kind: formData.get("kind"),
    quantity: formData.get("quantity"),
    unit_cost: formData.get("unit_cost"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  // Un ajuste puede dejar el saldo en 0; una entrada o merma de 0 no significa
  // nada y sólo ensuciaría la bitácora.
  if (d.kind !== "adjustment" && d.quantity <= 0) {
    return { error: "La cantidad debe ser mayor a cero." };
  }

  const supabase = await createSupabaseClient();
  const args: RpcArgsNullable<
    "register_stock_movement",
    "p_unit_cost" | "p_notes" | "p_sale"
  > = {
    p_product: d.product_id,
    p_branch: d.branch_id,
    p_kind: d.kind,
    p_quantity: d.quantity,
    p_unit_cost: d.unit_cost ?? null,
    p_notes: d.notes ?? null,
    p_sale: null,
  };

  const { error } = await supabase.rpc(
    "register_stock_movement",
    args as RpcArgs<"register_stock_movement">,
  );
  if (error) return { error: productError(error.message) };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${d.product_id}`);
  return { error: null, ok: "Movimiento registrado." };
}

const transferSchema = z.object({
  product_id: z.string().uuid(),
  from_branch: z.string().uuid("Elige la sucursal de origen"),
  to_branch: z.string().uuid("Elige la sucursal de destino"),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor a cero"),
  notes: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
});

/** Traspaso de piezas entre sucursales. */
export async function transferStock(
  _prev: StockFormState,
  formData: FormData,
): Promise<StockFormState> {
  await requireSession();

  const parsed = transferSchema.safeParse({
    product_id: formData.get("product_id"),
    from_branch: formData.get("from_branch"),
    to_branch: formData.get("to_branch"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  if (d.from_branch === d.to_branch) {
    return { error: "El origen y el destino deben ser distintos." };
  }

  const supabase = await createSupabaseClient();
  const args: RpcArgsNullable<"transfer_stock", "p_notes"> = {
    p_product: d.product_id,
    p_from: d.from_branch,
    p_to: d.to_branch,
    p_quantity: d.quantity,
    p_notes: d.notes ?? null,
  };

  const { error } = await supabase.rpc(
    "transfer_stock",
    args as RpcArgs<"transfer_stock">,
  );
  if (error) return { error: productError(error.message) };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${d.product_id}`);
  return { error: null, ok: "Traspaso registrado." };
}

/**
 * Los RAISE de negocio vienen en español y son útiles («no hay existencias
 * suficientes: quedan 4…»); los técnicos se sustituyen. El choque de índice
 * único se traduce, porque «duplicate key» no le dice nada a nadie.
 */
function productError(msg: string | undefined): string {
  if (!msg) return "No se pudo completar la operación.";
  if (/products_org_sku_key/.test(msg)) {
    return "Ya existe otro producto con ese SKU.";
  }
  if (/products_org_barcode_key/.test(msg)) {
    return "Ya existe otro producto con ese código de barras.";
  }
  const technical =
    /row-level security|violates|constraint|permission denied|null value|invalid input|syntax|duplicate key/i;
  return technical.test(msg) ? "No se pudo completar la operación." : msg;
}
