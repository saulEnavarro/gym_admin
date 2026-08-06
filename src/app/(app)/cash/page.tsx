import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  EyeOff,
  History,
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OpenSessionForm } from "@/components/cash/open-session-form";
import { CloseSessionForm } from "@/components/cash/close-session-form";
import { MovementForm } from "@/components/cash/movement-form";
import { getOpenCashSession, getSessionMovements } from "@/lib/cash/queries";
import { movementCategoryLabel, sessionDuration } from "@/lib/cash/helpers";
import { paymentLabel } from "@/lib/pos/helpers";
import { formatCurrency, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Caja" };

export default async function CashPage() {
  const { user, branding } = await requireSession();
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";
  const money = (n: number) => formatCurrency(n, currency, locale);

  const open = await getOpenCashSession(user.id);

  // ── Sin turno abierto: sólo se ofrece la apertura ──────────────────────────
  if (!open) {
    // Sólo las sucursales que este usuario puede operar (admin: todas).
    const { data: allowed } = await supabase.rpc("current_user_branch_ids");
    const ids = allowed ?? [];
    const { data: branches } = ids.length
      ? await supabase
          .from("branches")
          .select("id, name")
          .eq("is_active", true)
          .in("id", ids)
          .order("name")
      : { data: [] };

    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Header />
        <OpenSessionForm branches={branches ?? []} currency={currency} />
      </div>
    );
  }

  // ── Turno abierto: resumen, movimientos y cierre ───────────────────────────
  const { session, branchName, totals } = open;
  const movements = await getSessionMovements(session.id);

  // Arqueo a ciegas: mientras el turno está abierto NO se muestran el fondo
  // inicial ni el efectivo esperado. Si el cajero viera la cifra, la tecleraría
  // al cerrar y el control de diferencias sería puro trámite. Lo que sí ve es
  // su reporte de ventas y los movimientos que capturó, que necesita para
  // operar. El arqueo completo se revela en el corte, ya cerrado el turno.
  const cashSales = Number(totals?.cash_sales ?? 0);
  const cardSales = Number(totals?.card_sales ?? 0);
  const transferSales = Number(totals?.transfer_sales ?? 0);
  const salesTotal = cashSales + cardSales + transferSales;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Header />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex h-2 w-2 rounded-full bg-success" />
              Turno abierto
            </CardTitle>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Desde {new Date(session.opened_at).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {sessionDuration(session.opened_at)}
              </span>
              {branchName && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {branchName}
                </span>
              )}
            </div>
          </div>
          <CloseSessionForm sessionId={session.id} />
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-start gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-medium text-foreground">
                Arqueo a ciegas.
              </span>{" "}
              El efectivo esperado no se muestra durante el turno: al cerrar
              cuentas el cajón y capturas el total. El sistema calcula la
              diferencia y la deja registrada en el corte.
            </p>
          </div>

          {/* Ventas del turno por método */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Ventas del turno ({totals?.sales_count ?? 0})
            </p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Tile label="Efectivo" value={money(cashSales)} />
              <Tile label="Tarjeta" value={money(cardSales)} />
              <Tile label="Transferencia" value={money(transferSales)} />
              <Tile label="Total vendido" value={money(salesTotal)} strong />
            </div>
          </div>

          {/* Movimientos */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Movimientos ({movements.length})
              </p>
              <MovementForm currency={currency} />
            </div>

            {movements.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Sin ingresos ni egresos registrados en este turno.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {movements.map((m) => {
                  const income = m.kind === "income";
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            income
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {income ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {movementCategoryLabel(m.category)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {paymentLabel(m.payment_method)}
                            {m.description ? ` · ${m.description}` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-medium",
                          income ? "text-success" : "text-destructive",
                        )}
                      >
                        {income ? "+" : "−"}
                        {money(m.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Banknote className="h-6 w-6 text-primary" />
          Caja
        </h1>
        <p className="text-muted-foreground">
          Turno del cajero: apertura, movimientos y arqueo de cierre.
        </p>
      </div>
      <Link
        href="/cash/sessions"
        className={buttonVariants({ variant: "outline" })}
      >
        <History className="h-4 w-4" />
        Cortes anteriores
      </Link>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3",
        strong ? "border-primary/40 bg-primary/5" : "border-border",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate text-lg font-semibold",
          strong && "text-primary",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
