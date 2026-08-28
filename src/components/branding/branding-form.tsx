"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { saveBranding, type BrandingFormState } from "@/app/(app)/branding/actions";
import type { OrgBranding } from "@/lib/types/database.types";

const TIMEZONES = [
  ["America/Mexico_City", "Ciudad de México"],
  ["America/Tijuana", "Tijuana"],
  ["America/Hermosillo", "Hermosillo"],
  ["America/Cancun", "Cancún"],
  ["America/Monterrey", "Monterrey"],
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar personalización"}
    </Button>
  );
}

export function BrandingForm({
  branding,
  photoUrl,
}: {
  branding: OrgBranding;
  /** URL firmada de la foto guardada, o null si todavía no hay ninguna. */
  photoUrl: string | null;
}) {
  const [state, formAction] = useActionState<BrandingFormState, FormData>(
    saveBranding,
    { error: null, ok: null },
  );
  const [color, setColor] = useState(branding.primary_color);
  const [name, setName] = useState(branding.display_name ?? "");
  // Vista previa local del archivo elegido, antes de subirlo.
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  // Al guardar, React hace form.reset() y el <input type="file"> se vacía. La
  // vista previa local tiene que irse con él: a partir de ahí manda la foto ya
  // guardada, que llega firmada desde el servidor.
  useEffect(() => {
    if (!state.ok) return;
    setPreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setRemovePhoto(false);
  }, [state]);

  const shownPhoto = preview ?? (removePhoto ? null : photoUrl);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidad</CardTitle>
          <CardDescription>
            Así se ve tu gimnasio en el panel y en el portal de tus socios.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="display_name">Nombre comercial *</Label>
            <Input
              id="display_name"
              name="display_name"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_color">Color principal *</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
                aria-label="Elegir color"
              />
              <Input
                id="primary_color"
                name="primary_color"
                required
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font_family">Tipografía</Label>
            <Select
              id="font_family"
              name="font_family"
              defaultValue={branding.font_family}
            >
              <option value="Inter">Inter</option>
              <option value="Poppins">Poppins</option>
              <option value="Roboto">Roboto</option>
              <option value="Montserrat">Montserrat</option>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="photo">Foto del establecimiento</Label>
            <p className="text-sm text-muted-foreground">
              Sustituye al ícono genérico en el menú y en el portal de tus
              socios. Una foto de la fachada o del interior funciona mejor que
              un logotipo con letras chicas.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                {shownPhoto ? (
                  // Es una URL firmada temporal o un blob: local — sin next/image,
                  // que exige dominios fijos y aquí no aportaría nada.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={shownPhoto}
                    alt="Foto del establecimiento"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground/60" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  id="photo"
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium file:text-secondary-foreground"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setPreview(file ? URL.createObjectURL(file) : null);
                    if (file) setRemovePhoto(false);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG o WEBP, hasta 3 MB. Se guarda en privado y se muestra
                  con enlaces temporales.
                </p>

                {photoUrl && !preview && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      name="remove_photo"
                      checked={removePhoto}
                      onChange={(e) => setRemovePhoto(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar la foto al guardar
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Vista previa: el color se aplica de verdad al guardar. */}
          <div
            className="rounded-md border border-border p-4 sm:col-span-2"
            style={{ borderColor: color }}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Vista previa
            </p>
            <div className="mt-2 flex items-center gap-3">
              {shownPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownPhoto}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {(name || "G").slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="font-semibold">{name || "Tu gimnasio"}</span>
              <span
                className="ml-auto rounded-md px-3 py-1.5 text-sm font-medium text-white"
                style={{ backgroundColor: color }}
              >
                Botón
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Región</CardTitle>
          <CardDescription>
            La zona horaria decide a qué hora cierra el día en los cortes y los
            recordatorios. Cámbiala sólo si tu gimnasio no está en el centro.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <Select id="currency" name="currency" defaultValue={branding.currency}>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="USD">USD — Dólar</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="locale">Idioma</Label>
            <Select id="locale" name="locale" defaultValue={branding.locale}>
              <option value="es-MX">Español (México)</option>
              <option value="en-US">English (US)</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Select id="timezone" name="timezone" defaultValue={branding.timezone}>
              {TIMEZONES.map(([tz, label]) => (
                <option key={tz} value={tz}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacto</CardTitle>
          <CardDescription>
            Aparece en los correos que se le mandan a tus socios.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact_email">Correo de contacto</Label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={branding.contact_email ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_phone">Teléfono</Label>
            <Input
              id="contact_phone"
              name="contact_phone"
              defaultValue={branding.contact_phone ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              name="address"
              maxLength={400}
              defaultValue={branding.address ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {state.ok}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
