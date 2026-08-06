import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getCashSession,
  getSessionMovements,
} from "@/lib/cash/queries";
import {
  arqueoVerdict,
  movementCategoryLabel,
  sessionDuration,
} from "@/lib/cash/helpers";
import { formatFolio, paymentLabel } from "@/lib/pos/helpers";
import { formatCurrency, cn } from "@/lib/utils";
import type { Profile, Sale } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Corte de caja" };

export default async function CashSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { branding } = await requireSession();
  const { id } = await params;
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";
  const money = (n: number) => formatCurrency(n, currency, locale);

  const view = await getCashSession(id);
  if (!view) notFound();
  const { session, branchName, totals } = view;

  const [movements, { data: salesData }, { data: profiles }] =
    await Promise.all([
      getSessionMovements(session.id),
      supabase
        .from("sales")
        .select("id, folio, total, payment_method, status, sold_at")
        .eq("cash_session_id", session.id)
        .order("sold_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          [session.opened_by, session.closed_by].filter(Boolean) as string[],
        ),
    ]);

  const sales = (salesData ?? []) as Pick<
    Sale,
    "id" | "folio" | "total" | "payment_method" | "status" | "sold_at"
  >[];
  const nameById = new Map(
    ((profiles ?? []) as Pick<Profile, "id" | "full_name">[]).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

  const closed = session.status === "closed";
  const difference = Number(session.difference ?? 0);
  const verdict = arqueoVerdict(difference);
  // El arqueo (fondo, esperado, contado, diferencia) sólo se revela con el
  // turno CERRADO: mientras siga abierto, verlo aquí anularía el arqueo a
  // ciegas. `expected_cash` se congela al cerrar, así que no se recalcula.
  const expected = Number(session.expected_cash ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/cash/sessions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Cortes de caja
      </Link>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">
              Corte del {new Date(session.opened_at).toLocaleDateString(locale)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {nameById.get(session.opened_by) ?? "Cajero"}
              {branchName ? ` · ${branchName}` : ""} ·{" "}
              {sessionDuration(session.opened_at, session.closed_at)}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              closed
                ? "bg-muted text-muted-foreground"
                : "bg-success/10 text-success",
            )}
          >
            {closed ? "Cerrado" : "Abierto"}
          </span>
        </CardHeader>

        <CardContent className="space-y-6 text-sm">
          {/* Arqueo — sólo con el turno cerrado (arqueo a ciegas). */}
          {closed ? (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Arqueo
              </p>
              <Row label="Fondo inicial">{money(session.opening_float)}</Row>
              <Row label="Ventas en efectivo">
                {money(Number(totals?.cash_sales_gross ?? 0))}
              </Row>
              {Number(totals?.cash_income ?? 0) > 0 && (
                <Row label="Ingresos en efectivo">
                  +{money(Number(totals?.cash_income ?? 0))}
                </Row>
              )}
              {Number(totals?.cash_expense ?? 0) > 0 && (
                <Row label="Egresos en efectivo" muted>
                  −{money(Number(totals?.cash_expense ?? 0))}
                </Row>
              )}
              <div className="border-t border-border pt-2">
                <Row label="Efectivo esperado" strong>
                  {money(expected)}
                </Row>
              </div>
              <Row label="Efectivo contado" strong>
                {money(Number(session.counted_cash ?? 0))}
              </Row>
              <div className="border-t border-border pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Diferencia</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                      verdict.tone === "ok" && "bg-success/10 text-success",
                      verdict.tone === "short" &&
                        "bg-destructive/10 text-destructive",
                      verdict.tone === "over" && "bg-primary/10 text-primary",
                    )}
                  >
                    {verdict.tone === "ok"
                      ? verdict.label
                      : `${verdict.label} · ${money(Math.abs(difference))}`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-muted-foreground">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Turno en curso. El arqueo —fondo inicial, efectivo esperado,
                contado y diferencia— se revela al cerrarlo.
              </p>
            </div>
          )}

          {/* Ventas por método */}
          <div className="space-y-1 border-t border-border pt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Ventas del turno ({totals?.sales_count ?? 0})
            </p>
            <Row label="Efectivo">{money(Number(totals?.cash_sales ?? 0))}</Row>
            <Row label="Tarjeta">{money(Number(totals?.card_sales ?? 0))}</Row>
            <Row label="Transferencia">
              {money(Number(totals?.transfer_sales ?? 0))}
            </Row>
            <div className="border-t border-border pt-2">
              <Row label="Total vendido" strong>
                {money(
                  Number(totals?.cash_sales ?? 0) +
                    Number(totals?.card_sales ?? 0) +
                    Number(totals?.transfer_sales ?? 0),
                )}
              </Row>
            </div>
          </div>

          {/* Tickets */}
          {sales.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Tickets
              </p>
              <ul className="divide-y divide-border rounded-md border border-border">
                {sales.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-4 py-2"
                  >
                    <Link
                      href={`/pos/sales/${s.id}`}
                      className="font-mono text-xs hover:text-primary"
                    >
                      {formatFolio(s.folio)}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {paymentLabel(s.payment_method)}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        s.status === "cancelled" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {money(s.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Movimientos */}
          {movements.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Movimientos
              </p>
              <ul className="divide-y divide-border rounded-md border border-border">
                {movements.map((m) => {
                  const income = m.kind === "income";
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-4 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {income ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-success" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <span className="truncate">
                          {movementCategoryLabel(m.category)}
                          {m.description ? ` · ${m.description}` : ""}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium",
                          income ? "text-success" : "text-destructive",
                        )}
                      >
                        {income ? "+" : "−"}
                        {money(m.amount)} · {paymentLabel(m.payment_method)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {(session.open_notes || session.close_notes) && (
            <div className="space-y-1 border-t border-border pt-4 text-muted-foreground">
              {session.open_notes && <p>Apertura: {session.open_notes}</p>}
              {session.close_notes && <p>Cierre: {session.close_notes}</p>}
            </div>
          )}

          {closed && session.closed_at && (
            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
              Cerrado el {new Date(session.closed_at).toLocaleString(locale)}
              {session.closed_by
                ? ` por ${nameById.get(session.closed_by) ?? "—"}`
                : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
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
        "flex items-center justify-between",
        strong && "font-semibold",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );
}
