import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  FileSpreadsheet,
  FileText,
  Package,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PeriodSelector } from "@/components/reports/period-selector";
import { formatPeriodRange, resolvePeriod } from "@/lib/reports/period";
import { formatCurrency, cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Reportes de inventario" };

type SalesRow = Database["public"]["Functions"]["product_sales_report"]["Returns"][number];
type ValuationRow = Database["public"]["Functions"]["inventory_valuation"]["Returns"][number];

export default async function InventoryReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branding } = await requireSession();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";
  const timeZone = branding?.timezone ?? "America/Mexico_City";
  const money = (n: number) => formatCurrency(Number(n), currency, locale);

  const period = resolvePeriod(
    { period: one(sp.period), from: one(sp.from), to: one(sp.to) },
    timeZone,
  );
  const branchId = one(sp.branch) ?? null;

  const supabase = await createClient();
  const scope = {
    p_from: period.from,
    p_to: period.to,
    p_tz: timeZone,
    ...(branchId ? { p_branch: branchId } : {}),
  };

  const [{ data: branches }, { data: sales }, { data: valuation }] =
    await Promise.all([
      supabase.from("branches").select("id, name").order("name"),
      supabase.rpc("product_sales_report", scope),
      supabase.rpc(
        "inventory_valuation",
        branchId ? { p_branch: branchId } : {},
      ),
    ]);

  const rows = (sales ?? []) as SalesRow[];
  const stock = (valuation ?? []) as ValuationRow[];

  const revenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const profit = rows.reduce((s, r) => s + Number(r.profit), 0);
  const units = rows.reduce((s, r) => s + Number(r.quantity), 0);
  const stockValue = stock.reduce((s, r) => s + Number(r.stock_value), 0);
  const anyEstimated = rows.some((r) => r.estimated);

  const exportQuery = new URLSearchParams({
    period: period.kind,
    from: period.from,
    to: period.to,
    ...(branchId ? { branch: branchId } : {}),
  }).toString();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Inventario
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Reportes de inventario
          </h1>
          <p className="text-muted-foreground">
            {period.label} · {formatPeriodRange(period, locale)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/inventory/reports/export?format=csv&kind=sales&${exportQuery}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileText className="h-4 w-4" />
            Ventas CSV
          </a>
          <a
            href={`/inventory/reports/export?format=xlsx&kind=movements&${exportQuery}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Movimientos Excel
          </a>
        </div>
      </div>

      <PeriodSelector
        period={period.kind}
        from={period.from}
        to={period.to}
        branchId={branchId}
        branches={branches ?? []}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Package className="h-5 w-5" />}
          label="Piezas vendidas"
          value={String(units)}
        />
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="Ingreso"
          value={money(revenue)}
          hint="Sin IVA"
        />
        <Kpi
          icon={<BadgeDollarSign className="h-5 w-5" />}
          label="Utilidad"
          value={money(profit)}
          hint={
            revenue > 0
              ? `${Math.round((profit / revenue) * 1000) / 10}% del ingreso`
              : undefined
          }
        />
        <Kpi
          icon={<Package className="h-5 w-5" />}
          label="Valor del inventario"
          value={money(stockValue)}
          hint="A costo, hoy"
        />
      </div>

      {anyEstimated && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
          Algunas filas usan el costo del catálogo porque no hay una compra
          registrada antes de esa venta. Captura las entradas con su costo
          unitario y la utilidad dejará de ser una estimación.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos vendidos</CardTitle>
          <CardDescription>
            La utilidad usa el costo vigente al momento de vender, no el costo
            actual: si el proveedor sube el precio, lo ya vendido no cambia.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No se vendieron productos en el periodo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Producto</th>
                    <th className="px-6 py-3 text-right font-medium">Piezas</th>
                    <th className="px-6 py-3 text-right font-medium">Ingreso</th>
                    <th className="px-6 py-3 text-right font-medium">Costo</th>
                    <th className="px-6 py-3 text-right font-medium">Utilidad</th>
                    <th className="px-6 py-3 text-right font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r.product_id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-6 py-3">
                        {r.product_name}
                        {i === 0 && (
                          <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            Más vendido
                          </span>
                        )}
                        {i === rows.length - 1 && rows.length > 1 && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Menos vendido
                          </span>
                        )}
                        {r.estimated && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-500">
                            costo estimado
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">{r.quantity}</td>
                      <td className="px-6 py-3 text-right">{money(r.revenue)}</td>
                      <td className="px-6 py-3 text-right text-muted-foreground">
                        {money(r.cost)}
                      </td>
                      <td
                        className={cn(
                          "px-6 py-3 text-right font-medium",
                          Number(r.profit) < 0 && "text-destructive",
                        )}
                      >
                        {money(r.profit)}
                      </td>
                      <td className="px-6 py-3 text-right text-muted-foreground">
                        {r.margin_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existencias valuadas</CardTitle>
          <CardDescription>
            Cuánto dinero hay parado en el anaquel, a costo y a precio de venta.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stock.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Sin existencias registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Producto</th>
                    <th className="px-6 py-3 font-medium">Sucursal</th>
                    <th className="px-6 py-3 text-right font-medium">Piezas</th>
                    <th className="px-6 py-3 text-right font-medium">A costo</th>
                    <th className="px-6 py-3 text-right font-medium">A venta</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((r) => (
                    <tr
                      key={`${r.product_id}-${r.branch_id}`}
                      className={cn(
                        "border-b border-border/60 last:border-0",
                        r.below_min && "bg-amber-500/5",
                      )}
                    >
                      <td className="px-6 py-3">
                        {r.product_name}
                        {r.below_min && (
                          <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-500">
                            Bajo mínimo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {r.branch_name}
                      </td>
                      <td className="px-6 py-3 text-right">{r.quantity}</td>
                      <td className="px-6 py-3 text-right">
                        {money(r.stock_value)}
                      </td>
                      <td className="px-6 py-3 text-right text-muted-foreground">
                        {money(r.retail_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold">{value}</p>
          {hint && (
            <p className="truncate text-xs text-muted-foreground/70">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
