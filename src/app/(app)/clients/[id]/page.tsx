import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Cake,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Plus,
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
import { ToggleActiveButton } from "@/components/clients/toggle-active-button";
import { InvitePortalButton } from "@/components/clients/invite-portal-button";
import { RevokeAccessQrButton } from "@/components/clients/revoke-access-qr-button";
import { RemindersOptOutToggle } from "@/components/clients/reminders-opt-out-toggle";
import { getSignedUrl, CLIENT_PHOTOS_BUCKET } from "@/lib/storage";
import {
  ageFromBirthDate,
  formatMemberNumber,
  fullName,
  initials,
  sexLabel,
} from "@/lib/clients/helpers";
import { formatCurrency, cn } from "@/lib/utils";
import {
  membershipStatus,
  daysRemaining,
  formatFolio,
  paymentLabel,
  MEMBERSHIP_STATUS_LABELS,
} from "@/lib/pos/helpers";
import type {
  Client,
  ClientMembership,
  Sale,
} from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Ficha de cliente" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { branding } = await requireSession();
  const { id } = await params;
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();
  const c = client as Client;

  // Membresías del cliente (más reciente primero) y sus últimas ventas.
  const [{ data: memberships }, { data: sales }] = await Promise.all([
    supabase
      .from("client_memberships")
      .select("*")
      .eq("client_id", id)
      .order("end_date", { ascending: false })
      .limit(20),
    supabase
      .from("sales")
      .select("id, folio, total, payment_method, status, sold_at")
      .eq("client_id", id)
      .order("sold_at", { ascending: false })
      .limit(10),
  ]);

  const memRows = (memberships ?? []) as ClientMembership[];
  const saleRows = (sales ?? []) as Pick<
    Sale,
    "id" | "folio" | "total" | "payment_method" | "status" | "sold_at"
  >[];
  // Membresía vigente: la activa con vencimiento más lejano.
  const current =
    memRows.find((m) => membershipStatus(m) === "active") ?? null;

  const photoUrl = await getSignedUrl(CLIENT_PHOTOS_BUCKET, c.photo_url);
  const age = ageFromBirthDate(c.birth_date);
  const registered = new Date(c.created_at).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/clients"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Link>
      </div>

      {/* Encabezado */}
      <Card>
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold text-primary">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={fullName(c)}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              initials(c)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {fullName(c)}
              </h1>
              {c.is_active ? (
                <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Inactivo
                </span>
              )}
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              Cliente {formatMemberNumber(c.member_number)}
            </p>
            <p className="text-sm text-muted-foreground">
              Registrado el {registered}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/clients/${c.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            <ToggleActiveButton id={c.id} active={c.is_active} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Datos personales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={<Cake className="h-4 w-4" />} label="Edad">
              {age !== null ? `${age} años` : "—"}
            </Row>
            <Row label="Sexo">{sexLabel(c.sex)}</Row>
            <Row label="Fecha de nacimiento">
              {c.birth_date
                ? new Date(c.birth_date).toLocaleDateString("es-MX")
                : "—"}
            </Row>
            <Row icon={<MapPin className="h-4 w-4" />} label="Dirección">
              {c.address || "—"}
            </Row>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={<Phone className="h-4 w-4" />} label="Celular">
              {c.mobile_phone || "—"}
            </Row>
            <Row icon={<Phone className="h-4 w-4" />} label="Teléfono">
              {c.phone || "—"}
            </Row>
            <Row icon={<Mail className="h-4 w-4" />} label="Correo">
              {c.email || "—"}
            </Row>
            <Row label="Emergencia">
              {c.emergency_contact_name
                ? `${c.emergency_contact_name}${
                    c.emergency_contact_phone
                      ? ` · ${c.emergency_contact_phone}`
                      : ""
                  }`
                : "—"}
            </Row>
          </CardContent>
        </Card>
      </div>

      {c.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observaciones</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {c.notes}
          </CardContent>
        </Card>
      )}

      {/* Consentimiento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {c.data_consent_at ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-destructive" />
            )}
            Consentimiento de datos (LFPDPPP)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            {c.data_consent_at
              ? `Aviso de privacidad aceptado el ${new Date(
                  c.data_consent_at,
                ).toLocaleDateString("es-MX")}.`
              : "Sin consentimiento registrado."}
          </p>
          {c.guardian_consent && (
            <p>
              Consentimiento de tutor
              {c.guardian_name ? ` (${c.guardian_name})` : ""}: registrado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Portal del cliente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Portal del cliente
          </CardTitle>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <InvitePortalButton
              clientId={c.id}
              linked={Boolean(c.user_id)}
              hasEmail={Boolean(c.email)}
            />
            <RevokeAccessQrButton
              clientId={c.id}
              hasToken={Boolean(c.access_token)}
            />
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {c.user_id
            ? `El cliente puede iniciar sesión en el portal${
                c.portal_invited_at
                  ? ` (invitado el ${new Date(
                      c.portal_invited_at,
                    ).toLocaleDateString("es-MX")})`
                  : ""
              }.`
            : "Invita al cliente para que consulte su membresía, días restantes, QR e historial desde su propia cuenta."}
        </CardContent>
      </Card>

      {/* Recordatorios por correo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Recordatorios por correo
          </CardTitle>
          <RemindersOptOutToggle id={c.id} optOut={c.reminders_opt_out} />
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {c.reminders_opt_out
            ? "Este cliente NO recibirá recordatorios de vencimiento."
            : c.email
              ? "Recibirá avisos de vencimiento en su correo cuando corresponda."
              : "Sin correo en la ficha: no se le pueden enviar recordatorios."}
        </CardContent>
      </Card>

      {/* Membresía vigente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Membresía
          </CardTitle>
          <Link
            href="/pos"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Plus className="h-4 w-4" />
            Vender / renovar
          </Link>
        </CardHeader>
        <CardContent>
          {current ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium">{current.plan_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vigencia</p>
                <p className="font-medium">
                  {new Date(current.start_date).toLocaleDateString("es-MX")} →{" "}
                  {new Date(current.end_date).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Días restantes</p>
                <p className="text-xl font-bold text-success">
                  {daysRemaining(current.end_date)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin membresía activa.{" "}
              <Link href="/pos" className="text-primary hover:underline">
                Vender una membresía
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historial de membresías */}
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
                    <th className="px-4 py-2 font-medium">Inicio</th>
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
                        <td className="px-4 py-2 font-medium">{m.plan_name}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(m.start_date).toLocaleDateString("es-MX")}
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

      {/* Historial de pagos / ventas */}
      {saleRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de pagos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                      <td className="px-4 py-2">
                        <Link
                          href={`/pos/sales/${s.id}`}
                          className="font-mono font-medium hover:text-primary"
                        >
                          {formatFolio(s.folio)}
                        </Link>
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
                          {s.status === "cancelled" ? "Cancelada" : "Completada"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 font-medium">{children}</span>
    </div>
  );
}
