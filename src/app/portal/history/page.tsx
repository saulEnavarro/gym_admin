import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { requirePortalSession } from "@/lib/portal/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/portal-shell";
import { BrandStyle } from "@/components/brand-style";
import { getSignedUrl, ORG_LOGOS_BUCKET } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fullName } from "@/lib/clients/helpers";
import { formatFolio, paymentLabel } from "@/lib/pos/helpers";
import { formatCurrency, cn } from "@/lib/utils";
import type { Sale } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Portal del cliente · Historial" };

export default async function PortalHistoryPage() {
  const { client, organization, branding } = await requirePortalSession();
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";

  // RLS: sólo devuelve las ventas propias (como titular o pareja).
  const { data: sales } = await supabase
    .from("sales")
    .select("id, folio, total, payment_method, status, sold_at")
    .order("sold_at", { ascending: false })
    .limit(50);

  const saleRows = (sales ?? []) as Pick<
    Sale,
    "id" | "folio" | "total" | "payment_method" | "status" | "sold_at"
  >[];

  const orgPhotoUrl = await getSignedUrl(ORG_LOGOS_BUCKET, branding?.logo_url);

  return (
    <>
      <BrandStyle primaryColor={branding?.primary_color ?? "#4f46e5"} />
      <PortalShell
        orgName={branding?.display_name ?? organization?.name ?? "Mi gimnasio"}
        orgPhotoUrl={orgPhotoUrl}
        clientName={fullName(client)}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              Historial de pagos
            </CardTitle>
          </CardHeader>
          <CardContent className={saleRows.length > 0 ? "p-0" : undefined}>
            {saleRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no tienes compras registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Folio</th>
                      <th className="px-4 py-2 font-medium">Fecha</th>
                      <th className="px-4 py-2 font-medium">Pago</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                      <th className="px-4 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleRows.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-2 font-mono font-medium">
                          {formatFolio(s.folio)}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(s.sold_at).toLocaleDateString("es-MX")}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {paymentLabel(s.payment_method)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          {formatCurrency(s.total, currency, locale)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              s.status === "cancelled"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-success/10 text-success",
                            )}
                          >
                            {s.status === "cancelled"
                              ? "Cancelada"
                              : "Completada"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PortalShell>
    </>
  );
}
