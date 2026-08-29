import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Smartphone,
  CreditCard,
  Activity,
  QrCode,
  Receipt,
  Clock,
  ExternalLink,
  Pencil,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { PortalHome } from "@/components/portal/portal-home";
import { PortalPreviewPicker } from "@/components/portal/portal-preview-picker";
import { InvitePortalButton } from "@/components/clients/invite-portal-button";
import { getSignedUrl, ORG_LOGOS_BUCKET } from "@/lib/storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { fullName, formatMemberNumber } from "@/lib/clients/helpers";
import { membershipStatus, daysRemaining } from "@/lib/pos/helpers";
import { getOccupancyNow } from "@/lib/occupancy/queries";
import { crowdLabel, quietHoursFor } from "@/lib/occupancy/helpers";
import { addDays, todayInTz } from "@/lib/reports/period";
import { cn } from "@/lib/utils";
import type { Client, ClientMembership } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Portal del socio" };

type SearchParams = Promise<{ client?: string }>;

/** Todo lo que el socio puede hacer en su aplicación, para el panel «qué hace». */
const CAPABILITIES = [
  {
    icon: CreditCard,
    title: "Ver su membresía",
    body: "Plan vigente, fecha de vencimiento y días que le quedan.",
  },
  {
    icon: QrCode,
    title: "Su código QR de acceso",
    body: "Personal y renovable; sirve para el check-in aunque no tenga internet en el gimnasio.",
  },
  {
    icon: Activity,
    title: "Qué tan lleno está",
    body: "Aforo actual de su sucursal y las horas con menos gente para hoy.",
  },
  {
    icon: Receipt,
    title: "Su historial de pagos",
    body: "Consulta de sólo lectura de sus compras y renovaciones.",
  },
  {
    icon: Clock,
    title: "Historial de membresías",
    body: "Los planes que ha tenido, con su vencimiento y estado.",
  },
] as const;

export default async function PortalPreviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { organization, branding } = await requireSession();
  const supabase = await createClient();
  const { client: clientParam } = await searchParams;

  // Lista para el selector. El socio ve su portal desde su cuenta; aquí el
  // admin elige a quién previsualizar. Los que ya tienen portal van primero.
  const { data: clientList } = await supabase
    .from("clients")
    .select("id, first_name, last_name, member_number, user_id, email")
    .eq("is_active", true)
    .order("member_number", { ascending: false })
    .limit(500);

  const clients = (clientList ?? []) as Pick<
    Client,
    "id" | "first_name" | "last_name" | "member_number" | "user_id" | "email"
  >[];

  const selectedId =
    clientParam ??
    clients.find((c) => c.user_id)?.id ??
    clients[0]?.id ??
    null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Smartphone className="h-6 w-6 text-primary" />
          Portal del socio
        </h1>
        <p className="text-muted-foreground">
          Así se ve la aplicación del cliente. Elige un socio para previsualizar
          exactamente lo que él ve, sin salir del panel.
        </p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Registra un cliente para poder previsualizar su portal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PortalPreviewPicker clients={clients} selectedId={selectedId} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <PreviewFrame
              clientId={selectedId}
              orgName={
                branding?.display_name ??
                organization?.name ??
                "Tu gimnasio"
              }
              logoUrl={branding?.logo_url ?? null}
              timeZone={branding?.timezone ?? "America/Mexico_City"}
            />
            <SidePanel
              client={clients.find((c) => c.id === selectedId) ?? null}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** Marco tipo teléfono con la vista previa del portal para el socio elegido. */
async function PreviewFrame({
  clientId,
  orgName,
  logoUrl,
  timeZone,
}: {
  clientId: string | null;
  orgName: string;
  logoUrl: string | null;
  timeZone: string;
}) {
  if (!clientId) return null;
  const supabase = await createClient();

  const { data: clientRow } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  const client = clientRow as Client | null;
  if (!client) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          No se encontró el socio.
        </CardContent>
      </Card>
    );
  }

  const { data: memberships } = await supabase
    .from("client_memberships")
    .select("*")
    .eq("client_id", client.id)
    .order("end_date", { ascending: false })
    .limit(10);
  const memRows = (memberships ?? []) as ClientMembership[];
  const current = memRows.find((m) => membershipStatus(m) === "active") ?? null;
  const days = current ? daysRemaining(current.end_date) : 0;

  // Vista previa: se usa el token QUE YA TIENE el socio, sin rotarlo. Emitir uno
  // nuevo aquí invalidaría el QR que él ya guardó en su celular. Si aún no tiene,
  // se muestra el aviso propio del componente («pídelo en recepción»).
  const qrDataUrl = client.access_token
    ? await QRCode.toDataURL(client.access_token, { width: 240, margin: 1 })
    : null;
  const tokenExpiresAt = client.access_token_expires_at
    ? new Date(client.access_token_expires_at)
    : null;

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
  const isoHoy = ((new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const tranquilas = quietHoursFor(
    (
      (semana.data ?? []) as {
        weekday: number;
        hour: number;
        avg_inside: number;
      }[]
    ).map((r) => ({ ...r, avg_inside: Number(r.avg_inside) })),
    isoHoy,
  );
  const gentio = crowdLabel(aforo.inside, aforo.capacity);
  const orgPhotoUrl = await getSignedUrl(ORG_LOGOS_BUCKET, logoUrl);

  return (
    <div>
      <div className="rounded-2xl border border-border bg-muted/30 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5" />
          Vista del socio · sólo lectura
        </div>
        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          {/* Encabezado que imita el del portal real */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 font-semibold">
            {orgPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgPhotoUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                {orgName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate">{orgName}</span>
          </div>
          <div className="bg-muted/20 px-4 py-5">
            <p className="mb-4 text-sm text-muted-foreground">
              Hola,{" "}
              <span className="font-medium text-foreground">
                {fullName(client)}
              </span>
            </p>
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
          </div>
        </div>
      </div>
    </div>
  );
}

/** Columna de acciones y del «qué puede hacer». */
function SidePanel({
  client,
}: {
  client: Pick<
    Client,
    "id" | "first_name" | "last_name" | "member_number" | "user_id" | "email"
  > | null;
}) {
  return (
    <div className="space-y-4">
      {client && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acceso del socio</CardTitle>
            <CardDescription>
              {fullName(client)} · {formatMemberNumber(client.member_number)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InvitePortalButton
              clientId={client.id}
              linked={Boolean(client.user_id)}
              hasEmail={Boolean(client.email)}
            />
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href={`/clients/${client.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Pencil className="h-4 w-4" />
                Abrir ficha del socio
              </Link>
              <a
                href="/portal/login"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir el portal real
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              El código QR y la baja de acceso se gestionan desde la ficha del
              socio. Cambiar la foto, el nombre o los colores del portal se hace
              en Personalización.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Qué puede hacer</CardTitle>
          <CardDescription>Todo lo que ofrece la app del cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{cap.title}</p>
                  <p className="text-xs text-muted-foreground">{cap.body}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
