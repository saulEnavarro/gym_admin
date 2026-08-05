import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { formatFolio, paymentLabel } from "@/lib/pos/helpers";
import { formatMemberNumber } from "@/lib/clients/helpers";
import type { Sale, Client } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Ventas" };

export default async function SalesHistoryPage() {
  const { branding } = await requireSession();
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";
  const money = (n: number) => formatCurrency(n, currency, locale);

  const { data: sales } = await supabase
    .from("sales")
    .select(
      "id, folio, client_id, total, payment_method, status, sold_at",
    )
    .order("sold_at", { ascending: false })
    .limit(200);

  const rows = (sales ?? []) as Pick<
    Sale,
    "id" | "folio" | "client_id" | "total" | "payment_method" | "status" | "sold_at"
  >[];

  // Nombres de cliente en un solo query.
  const clientIds = [...new Set(rows.map((r) => r.client_id))];
  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id, member_number, first_name, last_name")
        .in("id", clientIds)
    : { data: [] };
  const clientById = new Map(
    (clients ?? []).map((c) => [
      c.id,
      c as Pick<Client, "id" | "member_number" | "first_name" | "last_name">,
    ]),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Historial de ventas del POS.</p>
        </div>
        <Link href="/pos" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Nueva venta
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aún no hay ventas registradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Folio</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Pago</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const c = clientById.get(s.client_id);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border/60 last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/pos/sales/${s.id}`}
                            className="font-mono font-medium hover:text-primary"
                          >
                            {formatFolio(s.folio)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(s.sold_at).toLocaleDateString("es-MX")}
                        </td>
                        <td className="px-4 py-3">
                          {c ? (
                            <span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {formatMemberNumber(c.member_number)}
                              </span>{" "}
                              {c.first_name} {c.last_name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {paymentLabel(s.payment_method)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {money(s.total)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              s.status === "cancelled"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-success/10 text-success",
                            )}
                          >
                            {s.status === "cancelled" ? "Cancelada" : "Completada"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
