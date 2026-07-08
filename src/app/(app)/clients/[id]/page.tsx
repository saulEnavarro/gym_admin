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
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleActiveButton } from "@/components/clients/toggle-active-button";
import { getSignedUrl, CLIENT_PHOTOS_BUCKET } from "@/lib/storage";
import {
  ageFromBirthDate,
  formatMemberNumber,
  fullName,
  initials,
  sexLabel,
} from "@/lib/clients/helpers";
import type { Client } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Ficha de cliente" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();
  const c = client as Client;

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

      {/* Placeholder honesto: membresías/pagos llegan en el siguiente slice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Membresías y pagos
          </CardTitle>
          <CardDescription>
            El historial de membresías, pagos y accesos aparecerá aquí al
            completar el módulo de membresías (Fase 1).
          </CardDescription>
        </CardHeader>
      </Card>
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
