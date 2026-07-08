"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SEX_LABELS, isMinor } from "@/lib/clients/helpers";
import type { Client } from "@/lib/types/database.types";

type ActionState = { error: string | null };
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export type BranchOption = { id: string; name: string };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

export function ClientForm({
  action,
  branches,
  client,
  cancelHref,
  submitLabel,
}: {
  action: Action;
  branches: BranchOption[];
  client?: Client | null;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {
    error: null,
  });
  // El bloque de tutor aparece si la fecha de nacimiento corresponde a un menor.
  const [birthDate, setBirthDate] = useState(client?.birth_date ?? "");
  const minor = isMinor(birthDate);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
          <CardDescription>
            El número de cliente se asigna automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *" htmlFor="first_name">
            <Input
              id="first_name"
              name="first_name"
              required
              maxLength={120}
              defaultValue={client?.first_name ?? ""}
            />
          </Field>
          <Field label="Apellidos *" htmlFor="last_name">
            <Input
              id="last_name"
              name="last_name"
              required
              maxLength={120}
              defaultValue={client?.last_name ?? ""}
            />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="birth_date">
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </Field>
          <Field label="Sexo" htmlFor="sex">
            <Select id="sex" name="sex" defaultValue={client?.sex ?? ""}>
              <option value="">Sin especificar</option>
              {Object.entries(SEX_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Foto" htmlFor="photo">
            <Input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-medium"
            />
          </Field>
          {branches.length > 0 && (
            <Field label="Sucursal de registro" htmlFor="branch_id">
              <Select
                id="branch_id"
                name="branch_id"
                defaultValue={client?.branch_id ?? ""}
              >
                <option value="">Sin asignar</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Celular" htmlFor="mobile_phone">
            <Input
              id="mobile_phone"
              name="mobile_phone"
              maxLength={40}
              defaultValue={client?.mobile_phone ?? ""}
            />
          </Field>
          <Field label="Teléfono" htmlFor="phone">
            <Input
              id="phone"
              name="phone"
              maxLength={40}
              defaultValue={client?.phone ?? ""}
            />
          </Field>
          <Field label="Correo electrónico" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={160}
              defaultValue={client?.email ?? ""}
            />
          </Field>
          <Field label="Dirección" htmlFor="address">
            <Input
              id="address"
              name="address"
              maxLength={400}
              defaultValue={client?.address ?? ""}
            />
          </Field>
          <Field label="Contacto de emergencia" htmlFor="emergency_contact_name">
            <Input
              id="emergency_contact_name"
              name="emergency_contact_name"
              maxLength={160}
              defaultValue={client?.emergency_contact_name ?? ""}
            />
          </Field>
          <Field
            label="Teléfono de emergencia"
            htmlFor="emergency_contact_phone"
          >
            <Input
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              maxLength={40}
              defaultValue={client?.emergency_contact_phone ?? ""}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder="Notas internas, condiciones médicas, etc."
            defaultValue={client?.notes ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consentimiento de datos</CardTitle>
          <CardDescription>
            Aviso de privacidad (LFPDPPP). Obligatorio para dar de alta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="data_consent"
              defaultChecked={!!client?.data_consent_at}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              El cliente aceptó el aviso de privacidad y el tratamiento de sus
              datos personales.
            </span>
          </label>

          {minor && (
            <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="text-sm font-medium">
                El cliente es menor de edad: se requiere consentimiento del
                tutor.
              </p>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="guardian_consent"
                  defaultChecked={client?.guardian_consent ?? false}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <span>El tutor autoriza el registro y tratamiento de datos.</span>
              </label>
              <Field label="Nombre del tutor" htmlFor="guardian_name">
                <Input
                  id="guardian_name"
                  name="guardian_name"
                  maxLength={160}
                  defaultValue={client?.guardian_name ?? ""}
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
