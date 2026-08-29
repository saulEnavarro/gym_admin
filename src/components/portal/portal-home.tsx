import { Activity, CalendarClock, Clock, CreditCard, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMemberNumber } from "@/lib/clients/helpers";
import { membershipStatus, MEMBERSHIP_STATUS_LABELS } from "@/lib/pos/helpers";
import { hourLabel } from "@/lib/occupancy/helpers";
import { cn } from "@/lib/utils";
import type { ClientMembership } from "@/lib/types/database.types";

export type PortalHomeData = {
  memberNumber: number;
  current: ClientMembership | null;
  days: number;
  occupancy: {
    inside: number;
    capacity: number | null;
    label: string;
    tone: "low" | "mid" | "high";
  };
  quietHours: number[];
  qrDataUrl: string | null;
  tokenExpiresAt: Date | null;
  memberships: ClientMembership[];
};

/**
 * Cuerpo del portal del socio (estado de membresía, ocupación, QR e historial).
 *
 * Es puramente presentacional: no lee datos ni sesión. Lo usan tanto el portal
 * real (`/portal`, con la sesión del socio) como la vista previa del panel
 * (`/portal-preview`, con datos que lee el admin). Así lo que ve el socio y lo
 * que ve el admin no pueden desincronizarse: es el mismo componente.
 */
export function PortalHome({ data }: { data: PortalHomeData }) {
  const { current, days, occupancy, quietHours, qrDataUrl, tokenExpiresAt } =
    data;

  return (
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
              No tienes una membresía activa. Acércate a recepción para renovar y
              seguir entrenando.
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
                occupancy.tone === "low" && "bg-success/10 text-success",
                occupancy.tone === "mid" &&
                  "bg-amber-500/10 text-amber-600 dark:text-amber-500",
                occupancy.tone === "high" && "bg-destructive/10 text-destructive",
              )}
            >
              {occupancy.label}
            </span>
            <span className="text-sm text-muted-foreground">
              {occupancy.inside}{" "}
              {occupancy.inside === 1 ? "persona" : "personas"}
              {occupancy.capacity ? ` de ${occupancy.capacity}` : ""}
            </span>
          </div>

          {quietHours.length > 0 ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Horarios con menos gente hoy
              </p>
              <div className="flex flex-wrap gap-2">
                {quietHours.map((h) => (
                  <span
                    key={h}
                    className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-sm"
                  >
                    {hourLabel(h)}
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
                Cliente {formatMemberNumber(data.memberNumber)}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Muestra este código en recepción para registrar tu acceso. Puedes
                tomarle una captura: sirve aunque no tengas internet en el
                gimnasio.
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
      {data.memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de membresías</CardTitle>
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
                  {data.memberships.map((m) => {
                    const st = membershipStatus(m);
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-2 font-medium">{m.plan_name}</td>
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
  );
}
