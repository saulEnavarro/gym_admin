import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import type { Period } from "./period";

type Returns<T extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][T]["Returns"];

export type SalesSummary = Returns<"sales_summary">[number];
export type SalesByDay = Returns<"sales_by_day">[number];
export type SalesByPlan = Returns<"sales_by_plan">[number];
export type SalesByCashier = Returns<"sales_by_cashier">[number];
export type SalesByHour = Returns<"sales_by_hour">[number];
export type SaleDetailRow = Returns<"sales_detail">[number];

export type ReportScope = {
  period: Period;
  /** null = todas las sucursales que el usuario puede ver (lo acota RLS). */
  branchId: string | null;
  timeZone: string;
};

/** Argumentos comunes. `p_branch` se omite cuando no hay filtro: su default es null. */
function args({ period, branchId, timeZone }: ReportScope) {
  return {
    p_from: period.from,
    p_to: period.to,
    p_tz: timeZone,
    ...(branchId ? { p_branch: branchId } : {}),
  };
}

const EMPTY_SUMMARY: SalesSummary = {
  sales_count: 0,
  subtotal: 0,
  discount_amount: 0,
  tax_amount: 0,
  total: 0,
  gross_total: 0,
  avg_ticket: 0,
  cash_total: 0,
  card_total: 0,
  transfer_total: 0,
  refunds_count: 0,
  refunds_total: 0,
  cash_in: 0,
  cash_out: 0,
  net_revenue: 0,
  new_clients: 0,
};

/**
 * Todo el corte en un solo viaje de red. Cada función agrega dentro de
 * Postgres bajo RLS, así que la app nunca ve ventas de otra organización.
 */
export async function getReport(scope: ReportScope) {
  const supabase = await createClient();
  const a = args(scope);

  const [summary, byDay, byPlan, byCashier, byHour] = await Promise.all([
    supabase.rpc("sales_summary", a),
    supabase.rpc("sales_by_day", a),
    supabase.rpc("sales_by_plan", a),
    supabase.rpc("sales_by_cashier", a),
    supabase.rpc("sales_by_hour", a),
  ]);

  return {
    // `sales_summary` devuelve una sola fila; sin ventas puede venir vacía.
    summary: (summary.data?.[0] as SalesSummary | undefined) ?? EMPTY_SUMMARY,
    byDay: (byDay.data ?? []) as SalesByDay[],
    byPlan: (byPlan.data ?? []) as SalesByPlan[],
    byCashier: (byCashier.data ?? []) as SalesByCashier[],
    byHour: (byHour.data ?? []) as SalesByHour[],
  };
}

/** Detalle venta por venta: alimenta el export a Excel/CSV. */
export async function getSalesDetail(
  scope: ReportScope,
): Promise<SaleDetailRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("sales_detail", args(scope));
  return (data ?? []) as SaleDetailRow[];
}
