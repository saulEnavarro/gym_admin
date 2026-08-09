import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { resolvePeriod } from "@/lib/reports/period";
import { toCsv, type Column } from "@/lib/export/csv";
import { toXlsx } from "@/lib/export/xlsx";
import { movementLabel } from "@/lib/inventory/helpers";
import type {
  Database,
  StockMovementKind,
} from "@/lib/types/database.types";

// exceljs es Node puro: el runtime edge no le sirve.
export const runtime = "nodejs";

type SalesRow =
  Database["public"]["Functions"]["product_sales_report"]["Returns"][number];
type MovementRow =
  Database["public"]["Functions"]["stock_movements_detail"]["Returns"][number];

/**
 * Export de los reportes de inventario.
 *   ?kind=sales      → productos vendidos con utilidad
 *   ?kind=movements  → bitácora de entradas y salidas
 *
 * Ambas fuentes agregan bajo RLS, así que manipular la URL no saca datos de
 * otra organización. El saneo anti-inyección de fórmulas va en las utilidades.
 */
export async function GET(request: Request) {
  const ctx = await getSessionContext();
  if (!ctx?.membership) return new Response("No autorizado", { status: 401 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const kind = url.searchParams.get("kind") === "movements" ? "movements" : "sales";
  const locale = ctx.branding?.locale ?? "es-MX";
  const timeZone = ctx.branding?.timezone ?? "America/Mexico_City";

  const period = resolvePeriod(
    {
      period: url.searchParams.get("period") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    },
    timeZone,
  );
  const branchId = url.searchParams.get("branch");
  const scope = {
    p_from: period.from,
    p_to: period.to,
    p_tz: timeZone,
    ...(branchId ? { p_branch: branchId } : {}),
  };

  const supabase = await createClient();
  const slug = ctx.organization?.slug ?? "gimnasio";
  const base = `${kind === "sales" ? "productos" : "movimientos"}_${slug}_${period.from}_a_${period.to}`;

  if (kind === "sales") {
    const { data } = await supabase.rpc("product_sales_report", scope);
    const rows = (data ?? []) as SalesRow[];
    const columns: (Column<SalesRow> & { width?: number; money?: boolean })[] = [
      { header: "Producto", value: (r) => r.product_name, width: 30 },
      { header: "Piezas", value: (r) => Number(r.quantity), width: 10 },
      { header: "Ingreso sin IVA", value: (r) => Number(r.revenue), width: 16, money: true },
      { header: "Costo", value: (r) => Number(r.cost), width: 14, money: true },
      { header: "Utilidad", value: (r) => Number(r.profit), width: 14, money: true },
      { header: "Margen %", value: (r) => Number(r.margin_pct), width: 11 },
      {
        header: "Costo estimado",
        value: (r) => (r.estimated ? "Sí" : "No"),
        width: 15,
      },
    ];
    return deliver(format, rows, columns, base, "Productos vendidos");
  }

  const { data } = await supabase.rpc("stock_movements_detail", scope);
  const rows = (data ?? []) as MovementRow[];
  const dateFmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  });
  const columns: (Column<MovementRow> & { width?: number; money?: boolean })[] = [
    { header: "Fecha", value: (r) => dateFmt.format(new Date(r.created_at)), width: 18 },
    { header: "Producto", value: (r) => r.product_name, width: 30 },
    { header: "SKU", value: (r) => r.sku, width: 14 },
    { header: "Sucursal", value: (r) => r.branch_name, width: 24 },
    {
      header: "Movimiento",
      value: (r) => movementLabel(r.kind as StockMovementKind),
      width: 20,
    },
    // Ya viene con signo: el export se puede sumar directo.
    { header: "Piezas", value: (r) => Number(r.signed_qty), width: 10 },
    { header: "Costo unitario", value: (r) => Number(r.unit_cost ?? 0), width: 15, money: true },
    { header: "Nota", value: (r) => r.notes, width: 34 },
    { header: "Registró", value: (r) => r.actor, width: 26 },
  ];
  return deliver(format, rows, columns, base, "Movimientos");
}

async function deliver<T>(
  format: "csv" | "xlsx",
  rows: T[],
  columns: (Column<T> & { width?: number; money?: boolean })[],
  base: string,
  sheet: string,
) {
  if (format === "csv") {
    return new Response(toCsv(rows, columns), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buffer = await toXlsx(rows, columns, { sheetName: sheet });
  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
