import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CancelSaleButton } from "@/components/pos/cancel-sale-button";
import { formatCurrency, cn } from "@/lib/utils";
import { IVA_RATE } from "@/lib/billing/iva";
import { formatFolio, paymentLabel } from "@/lib/pos/helpers";
import { formatMemberNumber } from "@/lib/clients/helpers";
import type {
  Sale,
  SaleItem,
  Client,
  ClientMembership,
} from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Ticket de venta" };

export default async function SaleTicketPage({
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

  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!sale) notFound();
  const s = sale as Sale;

  const [{ data: items }, { data: memberships }] = await Promise.all([
    supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", id)
      .order("created_at"),
    supabase
      .from("client_memberships")
      .select("*")
      .eq("sale_id", id),
  ]);

  const clientIds = [s.client_id, s.partner_client_id].filter(
    Boolean,
  ) as string[];
  const { data: clients } = await supabase
    .from("clients")
    .select("id, member_number, first_name, last_name")
    .in("id", clientIds);
  const clientById = new Map(
    (clients ?? []).map((c) => [c.id, c as Pick<Client, "id" | "member_number" | "first_name" | "last_name">]),
  );
  const buyer = clientById.get(s.client_id);
  const partner = s.partner_client_id
    ? clientById.get(s.partner_client_id)
    : null;

  const cancelled = s.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/pos/sales"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Ventas
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">
              Venta {formatFolio(s.folio)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(s.sold_at).toLocaleString("es-MX")}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              cancelled
                ? "bg-destructive/10 text-destructive"
                : "bg-success/10 text-success",
            )}
          >
            {cancelled ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {cancelled ? "Cancelada" : "Completada"}
          </span>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {/* Cliente(s) */}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Cliente
            </p>
            {buyer && (
              <Link
                href={`/clients/${buyer.id}`}
                className="font-medium hover:text-primary"
              >
                <span className="font-mono text-muted-foreground">
                  {formatMemberNumber(buyer.member_number)}
                </span>{" "}
                {buyer.first_name} {buyer.last_name}
              </Link>
            )}
            {partner && (
              <div>
                <span className="text-xs text-muted-foreground">Pareja: </span>
                <Link
                  href={`/clients/${partner.id}`}
                  className="font-medium hover:text-primary"
                >
                  {partner.first_name} {partner.last_name}
                </Link>
              </div>
            )}
          </div>

          {/* Líneas */}
          <div className="space-y-1">
            {(items ?? []).map((it) => {
              const item = it as SaleItem;
              return (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.description}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </span>
                  <span className="font-medium">{money(item.line_total)}</span>
                </div>
              );
            })}
          </div>

          {/* Desglose */}
          <div className="space-y-1 border-t border-border pt-3">
            <Row label="Subtotal">{money(s.subtotal)}</Row>
            {s.discount_amount > 0 && (
              <Row label="Descuento" muted>
                −{money(s.discount_amount)}
              </Row>
            )}
            <Row label={`IVA (${Math.round(IVA_RATE * 100)}%)`}>
              {money(s.tax_amount)}
            </Row>
            <div className="border-t border-border pt-2">
              <Row label="Total" strong>
                {money(s.total)}
              </Row>
            </div>
          </div>

          <div className="flex justify-between border-t border-border pt-3 text-muted-foreground">
            <span>Método de pago</span>
            <span className="font-medium text-foreground">
              {paymentLabel(s.payment_method)}
            </span>
          </div>

          {/* Vigencia otorgada */}
          {(memberships ?? []).length > 0 && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Membresía otorgada
              </p>
              {(memberships ?? []).map((m) => {
                const mem = m as ClientMembership;
                return (
                  <p key={mem.id} className="text-sm">
                    {mem.plan_name}:{" "}
                    {new Date(mem.start_date).toLocaleDateString("es-MX")} →{" "}
                    {new Date(mem.end_date).toLocaleDateString("es-MX")}
                  </p>
                );
              })}
            </div>
          )}

          {s.notes && (
            <p className="text-sm text-muted-foreground">Notas: {s.notes}</p>
          )}

          {cancelled && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Venta cancelada</p>
              {s.cancelled_at && (
                <p className="text-muted-foreground">
                  {new Date(s.cancelled_at).toLocaleString("es-MX")}
                  {s.refund_amount != null
                    ? ` · Reembolso: ${money(s.refund_amount)}`
                    : ""}
                </p>
              )}
              {s.cancel_reason && (
                <p className="text-muted-foreground">Motivo: {s.cancel_reason}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!cancelled && (
        <div className="flex justify-end">
          <CancelSaleButton id={s.id} />
        </div>
      )}
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
        strong && "text-base font-semibold",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span>{children}</span>
    </div>
  );
}
