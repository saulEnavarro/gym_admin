import type { Metadata } from "next";
import QRCode from "qrcode";
import { requirePortalSession } from "@/lib/portal/session";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal/portal-shell";
import { PortalHome } from "@/components/portal/portal-home";
import { BrandStyle } from "@/components/brand-style";
import { getSignedUrl, ORG_LOGOS_BUCKET } from "@/lib/storage";
import { fullName } from "@/lib/clients/helpers";
import { membershipStatus, daysRemaining } from "@/lib/pos/helpers";
import { getOccupancyNow } from "@/lib/occupancy/queries";
import { crowdLabel, quietHoursFor } from "@/lib/occupancy/helpers";
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
        <PortalHome
          data={{
            memberNumber: client.member_number,
            current,
            days,
            occupancy: {
              inside: aforo.inside,
              capacity: aforo.capacity,
              label: gentio.label,
              tone: gentio.tone,
            },
            quietHours: tranquilas.map((h) => h.hour),
            qrDataUrl,
            tokenExpiresAt,
            memberships: memRows,
          }}
        />
      </PortalShell>
    </>
  );
}
