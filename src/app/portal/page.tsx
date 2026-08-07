import type { Metadata } from "next";
import QRCode from "qrcode";
import { CalendarClock, CreditCard, QrCode } from "lucide-react";
import { requirePortalSession } from "@/lib/portal/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/portal-shell";
import { BrandStyle } from "@/components/brand-style";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fullName, formatMemberNumber } from "@/lib/clients/helpers";
import {
  membershipStatus,
  daysRemaining,
  MEMBERSHIP_STATUS_LABELS,
} from "@/lib/pos/helpers";
import { cn } from "@/lib/utils";
import type { ClientMembership } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Portal del cliente" };

export default async function PortalHomePage() {
  const { client, organization, branding } = await requirePortalSession();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("client_memberships")
    .select("*")
    .eq("client_id", client.id)
    .order("end_date", { ascending: false })
    .limit(10);

  const memRows = (memberships ?? []) as ClientMembership[];
  const current = memRows.find((m) => membershipStatus(m) === "active") ?? null;
  const days = current ? daysRemaining(current.end_date) : 0;

  // QR personal: codifica el id de la ficha (base para el check-in de Fase 3).
  const qrDataUrl = await QRCode.toDataURL(client.id, {
    width: 240,
    margin: 1,
  });

  return (
    <>
      <BrandStyle primaryColor={branding?.primary_color ?? "#4f46e5"} />
      <PortalShell
        orgName={branding?.display_name ?? organization?.name ?? "Mi gimnasio"}
        clientName={fullName(client)}
      >
        <div className="space-y-6">
          {/* Estado de membresía */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Tu membresía
              </CardTitle>
            </CardHeader>
            <CardContent>
              {current ? (
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="text-lg font-semibold">{current.plan_name}</p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      Vence el{" "}
                      {new Date(current.end_date).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="rounded-lg bg-success/10 px-6 py-4 text-center">
                    <p className="text-3xl font-bold text-success">{days}</p>
                    <p className="text-xs font-medium uppercase tracking-wide text-success">
                      {days === 1 ? "día restante" : "días restantes"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  No tienes una membresía activa. Acércate a recepción para
                  renovar y seguir entrenando.
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4" />
                Tu código de acceso
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Código QR personal"
                width={240}
                height={240}
                className="rounded-lg border border-border bg-white p-2"
              />
              <p className="font-mono text-sm text-muted-foreground">
                Cliente {formatMemberNumber(client.member_number)}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Muestra este código en recepción para registrar tu acceso.
              </p>
            </CardContent>
          </Card>

          {/* Historial de membresías (resumen) */}
          {memRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Historial de membresías
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2 font-medium">Plan</th>
                        <th className="px-4 py-2 font-medium">Vence</th>
                        <th className="px-4 py-2 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memRows.map((m) => {
                        const st = membershipStatus(m);
                        return (
                          <tr
                            key={m.id}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="px-4 py-2 font-medium">
                              {m.plan_name}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {new Date(m.end_date).toLocaleDateString("es-MX")}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                  st === "active" && "bg-success/10 text-success",
                                  st === "expired" &&
                                    "bg-amber-500/10 text-amber-600 dark:text-amber-500",
                                  st === "cancelled" &&
                                    "bg-muted text-muted-foreground",
                                )}
                              >
                                {MEMBERSHIP_STATUS_LABELS[st]}
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
      </PortalShell>
    </>
  );
}
