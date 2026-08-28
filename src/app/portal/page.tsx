import type { Metadata } from "next";
import QRCode from "qrcode";
import { Activity, CalendarClock, Clock, CreditCard, QrCode } from "lucide-react";
import { requirePortalSession } from "@/lib/portal/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/portal-shell";
import { BrandStyle } from "@/components/brand-style";
import { getSignedUrl, ORG_LOGOS_BUCKET } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fullName, formatMemberNumber } from "@/lib/clients/helpers";
import {
  membershipStatus,
  daysRemaining,
  MEMBERSHIP_STATUS_LABELS,
} from "@/lib/pos/helpers";
import { cn } from "@/lib/utils";
import { getOccupancyNow } from "@/lib/occupancy/queries";
import { crowdLabel, hourLabel, quietHoursFor } from "@/lib/occupancy/helpers";
import { addDays, todayInTz } from "@/lib/reports/period";
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

  // QR personal. Codifica un token propio, NO `client.id` —ese id ya viaja en
  // las URLs del panel y no sirve como credencial de puerta.
  //
  // Se renueva sólo cuando faltan menos de 15 días para que caduque, y no en
  // cada visita a propósito: muchos gimnasios no tienen WiFi para socios, así
  // que la captura de pantalla que el socio tomó hace días tiene que seguir
  // abriendo. Rotar aquí (con datos) es justo cuando puede capturar el nuevo.
  const RENEW_WITHIN_DAYS = 15;
  const expiresAt = client.access_token_expires_at
    ? new Date(client.access_token_expires_at)
    : null;
  const needsToken =
    !client.access_token ||
    !expiresAt ||
    expiresAt.getTime() - Date.now() < RENEW_WITHIN_DAYS * 86_400_000;

  let token = client.access_token;
  let tokenExpiresAt = expiresAt;
  if (needsToken) {
    const { data: issued } = await supabase.rpc("issue_access_token", {
      p_client: client.id,
    });
    if (issued) {
      token = issued;
      tokenExpiresAt = new Date(Date.now() + 90 * 86_400_000);
    }
  }

  const qrDataUrl = token
    ? await QRCode.toDataURL(token, { width: 240, margin: 1 })
    : null;

  // Ocupación de SU sucursal. Consulta normal, no suscripción en vivo: el socio
  // mira esto una vez antes de salir de casa y un dato de hace un minuto le
  // sirve igual (ver migración 0022 sobre por qué se descartó Realtime).
  const timeZone = branding?.timezone ?? "America/Mexico_City";
  const hoy = todayInTz(timeZone);
  const [aforo, semana] = await Promise.all([
    getOccupancyNow(client.branch_id),
    supabase.rpc("occupancy_by_weekday_hour", {
      p_from: addDays(hoy, -27),
      p_to: hoy,
      p_tz: timeZone,
      ...(client.branch_id ? { p_branch: client.branch_id } : {}),
    }),
  ]);

  // isodow: 1 = lunes … 7 = domingo (getUTCDay da 0 = domingo).
  const isoHoy = ((new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const tranquilas = quietHoursFor(
    ((semana.data ?? []) as { weekday: number; hour: number; avg_inside: number }[]).map(
      (r) => ({ ...r, avg_inside: Number(r.avg_inside) }),
    ),
    isoHoy,
  );
  const gentio = crowdLabel(aforo.inside, aforo.capacity);

  const orgPhotoUrl = await getSignedUrl(ORG_LOGOS_BUCKET, branding?.logo_url);

  return (
    <>
      <BrandStyle primaryColor={branding?.primary_color ?? "#4f46e5"} />
      <PortalShell
        orgName={branding?.display_name ?? organization?.name ?? "Mi gimnasio"}
        orgPhotoUrl={orgPhotoUrl}
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

          {/* Ocupación de la sucursal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                ¿Qué tan lleno está?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                    gentio.tone === "low" && "bg-success/10 text-success",
                    gentio.tone === "mid" &&
                      "bg-amber-500/10 text-amber-600 dark:text-amber-500",
                    gentio.tone === "high" && "bg-destructive/10 text-destructive",
                  )}
                >
                  {gentio.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {aforo.inside} {aforo.inside === 1 ? "persona" : "personas"}
                  {aforo.capacity ? ` de ${aforo.capacity}` : ""}
                </span>
              </div>

              {tranquilas.length > 0 ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Horarios con menos gente hoy
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tranquilas.map((h) => (
                      <span
                        key={h.hour}
                        className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-sm"
                      >
                        {hourLabel(h.hour)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Cuando haya más historial te sugeriremos los mejores horarios.
                </p>
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
              {qrDataUrl ? (
                <>
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
                    Puedes tomarle una captura: sirve aunque no tengas internet
                    en el gimnasio.
                  </p>
                  {tokenExpiresAt && (
                    <p className="text-xs text-muted-foreground/70">
                      Válido hasta el{" "}
                      {tokenExpiresAt.toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      . Se renueva solo cuando abras el portal.
                    </p>
                  )}
                </>
              ) : (
                <p className="max-w-xs text-sm text-muted-foreground">
                  No pudimos generar tu código. Pídelo en recepción.
                </p>
              )}
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
