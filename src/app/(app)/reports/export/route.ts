import { getSessionContext } from "@/lib/auth/session";
import { getSalesDetail, type SaleDetailRow } from "@/lib/reports/queries";
import { resolvePeriod } from "@/lib/reports/period";
import { toCsv, type Column } from "@/lib/export/csv";
import { toXlsx } from "@/lib/export/xlsx";

// exceljs es Node puro: el runtime edge no le sirve.
export const runtime = "nodejs";

const PAYMENT: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

/**
 * Export del detalle de ventas del periodo a CSV o Excel.
 *
 * Los datos salen de `sales_detail`, que agrega bajo RLS: aunque alguien
 * manipule la URL, sólo puede exportar ventas de su propia organización. El
 * saneo anti-inyección de fórmulas vive en las utilidades de export.
 */
export async function GET(request: Request) {
  const ctx = await getSessionContext();
  if (!ctx?.membership) {
    return new Response("No autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
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

  const rows = await getSalesDetail({ period, branchId, timeZone });

  const dateFmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });

  const columns: (Column<SaleDetailRow> & {
    width?: number;
    money?: boolean;
  })[] = [
    { header: "Fecha", value: (r) => dateFmt.format(new Date(r.sold_at)), width: 12 },
    { header: "Hora", value: (r) => timeFmt.format(new Date(r.sold_at)), width: 10 },
    { header: "Folio", value: (r) => `V-${String(r.folio).padStart(4, "0")}`, width: 10 },
    { header: "No. cliente", value: (r) => r.member_number, width: 12 },
    { header: "Cliente", value: (r) => r.client_name, width: 28 },
    { header: "Membresía", value: (r) => r.items, width: 26 },
    { header: "Cajero", value: (r) => r.cashier_name, width: 26 },
    { header: "Sucursal", value: (r) => r.branch_name, width: 24 },
    {
      header: "Método de pago",
      value: (r) => PAYMENT[r.payment_method] ?? r.payment_method,
      width: 16,
    },
    { header: "Subtotal", value: (r) => Number(r.subtotal), width: 12, money: true },
    { header: "Descuento", value: (r) => Number(r.discount_amount), width: 12, money: true },
    { header: "IVA", value: (r) => Number(r.tax_amount), width: 12, money: true },
    { header: "Total", value: (r) => Number(r.total), width: 13, money: true },
    {
      header: "Estado",
      value: (r) => (r.status === "cancelled" ? "Cancelada" : "Completada"),
      width: 13,
    },
  ];

  const slug = ctx.organization?.slug ?? "gimnasio";
  const base =
    period.from === period.to
      ? `ventas_${slug}_${period.from}`
      : `ventas_${slug}_${period.from}_a_${period.to}`;

  if (format === "csv") {
    return new Response(toCsv(rows, columns), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buffer = await toXlsx(rows, columns, {
    sheetName: "Ventas",
    title: `Ventas ${period.from} — ${period.to}`,
  });

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
