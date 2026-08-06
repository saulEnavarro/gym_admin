import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownUp,
  FileSpreadsheet,
  FileText,
  Receipt,
  TrendingUp,
  Users,
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
import {
  HoursChart,
  PlansChart,
  RevenueChart,
} from "@/components/reports/charts";
import { getReport } from "@/lib/reports/queries";
import { formatPeriodRange, resolvePeriod } from "@/lib/reports/period";
import { formatCurrency, cn } from "@/lib/utils";
import { IVA_RATE } from "@/lib/billing/iva";

export const metadata: Metadata = { title: "Cortes" };

export default async function ReportsPage({
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
  const color = branding?.primary_color ?? "#7c3aed";
  const money = (n: number) => formatCurrency(Number(n), currency, locale);

  const period = resolvePeriod(
    { period: one(sp.period), from: one(sp.from), to: one(sp.to) },
    timeZone,
  );
  const branchId = one(sp.branch) ?? null;

  const supabase = await createClient();
  const [{ data: branches }, report] = await Promise.all([
    supabase.from("branches").select("id, name").order("name"),
    getReport({ period, branchId, timeZone }),
  ]);

  const { summary, byDay, byPlan, byCashier, byHour } = report;
  const best = byPlan[0];
  const worst = byPlan.length > 1 ? byPlan[byPlan.length - 1] : undefined;

  // Los parámetros del corte se reusan tal cual en el export.
  const exportQuery = new URLSearchParams({
    period: period.kind,
    from: period.from,
    to: period.to,
    ...(branchId ? { branch: branchId } : {}),
  }).toString();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cortes</h1>
          <p className="text-muted-foreground">
            {period.label} · {formatPeriodRange(period, locale)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/reports/export?format=csv&${exportQuery}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileText className="h-4 w-4" />
            CSV
          </a>
          <a
            href={`/reports/export?format=xlsx&${exportQuery}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
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

      {/* KPIs del periodo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="Ingresos"
          value={money(summary.total)}
          hint="Ventas completadas, IVA incluido"
        />
        <Kpi
          icon={<Receipt className="h-5 w-5" />}
          label="Ventas"
          value={String(summary.sales_count)}
          hint={`Ticket promedio ${money(summary.avg_ticket ?? 0)}`}
        />
        <Kpi
          icon={<ArrowDownUp className="h-5 w-5" />}
          label="Neto en caja"
          value={money(summary.net_revenue)}
          hint="Ingresos − reembolsos − egresos"
        />
        <Kpi
          icon={<Users className="h-5 w-5" />}
          label="Clientes nuevos"
          value={String(summary.new_clients)}
          hint="Altas en el periodo"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ingresos por día</CardTitle>
            <CardDescription>
              Ventas completadas, con IVA, en {formatPeriodRange(period, locale)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart
              data={byDay}
              currency={currency}
              locale={locale}
              color={color}
            />
          </CardContent>
        </Card>

        {/* Desglose contable del periodo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Line label="Subtotal (sin IVA)">{money(summary.subtotal)}</Line>
            {Number(summary.discount_amount) > 0 && (
              <Line label="Descuentos" muted>
                −{money(summary.discount_amount)}
              </Line>
            )}
            <Line label={`IVA (${Math.round(IVA_RATE * 100)}%)`}>
              {money(summary.tax_amount)}
            </Line>
            <div className="border-t border-border pt-2">
              <Line label="Total cobrado" strong>
                {money(summary.total)}
              </Line>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Por método de pago
              </p>
              <Line label="Efectivo">{money(summary.cash_total)}</Line>
              <Line label="Tarjeta">{money(summary.card_total)}</Line>
              <Line label="Transferencia">{money(summary.transfer_total)}</Line>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Salidas
              </p>
              <Line label={`Reembolsos (${summary.refunds_count})`} muted>
                −{money(summary.refunds_total)}
              </Line>
              <Line label="Egresos de caja" muted>
                −{money(summary.cash_out)}
              </Line>
              {Number(summary.cash_in) > 0 && (
                <Line label="Ingresos de caja">+{money(summary.cash_in)}</Line>
              )}
            </div>

            <div className="border-t border-border pt-2">
              <Line label="Neto" strong>
                {money(summary.net_revenue)}
              </Line>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membresías vendidas</CardTitle>
            <CardDescription>
              {best
                ? `Más vendida: ${best.plan_name}${
                    worst ? ` · Menos vendida: ${worst.plan_name}` : ""
                  }`
                : "Sin ventas en el periodo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlansChart
              data={byPlan}
              currency={currency}
              locale={locale}
              color={color}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Horarios de mayor venta</CardTitle>
            <CardDescription>
              Número de ventas por hora ({timeZone.split("/")[1] ?? timeZone}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HoursChart
              data={byHour}
              currency={currency}
              locale={locale}
              color={color}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas por empleado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {byCashier.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Sin ventas en el periodo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Cajero</th>
                    <th className="px-6 py-3 text-right font-medium">Ventas</th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                    <th className="px-6 py-3 text-right font-medium">
                      Participación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byCashier.map((c) => {
                    const share = Number(summary.total)
                      ? (Number(c.total) / Number(summary.total)) * 100
                      : 0;
                    return (
                      <tr
                        key={c.cashier_id ?? c.cashier_name}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-6 py-3">{c.cashier_name}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {c.sales_count}
                        </td>
                        <td className="px-6 py-3 text-right font-medium">
                          {money(c.total)}
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {share.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        ¿Buscas el arqueo de un turno?{" "}
        <Link href="/cash/sessions" className="text-primary hover:underline">
          Cortes de caja
        </Link>
        .
      </p>
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

function Line({
  label,
  children,
  strong,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        strong && "font-semibold",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span className="shrink-0">{children}</span>
    </div>
  );
}
