"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  provisionOrganization,
  type ProvisionState,
} from "@/app/admin/actions";

/** «Iron Temple» → «iron-temple». Sin acentos ni símbolos. */
function toSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Dando de alta…" : "Dar de alta el gimnasio"}
    </Button>
  );
}

export function ProvisionForm() {
  const [state, formAction] = useActionState<ProvisionState, FormData>(
    provisionOrganization,
    { error: null, ok: null },
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del gimnasio *</Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              // El identificador se propone solo, pero deja de seguir al nombre
              // en cuanto el operador lo edita a mano.
              if (!slugTouched) setSlug(toSlug(e.target.value));
            }}
            placeholder="Iron Temple"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Identificador *</Label>
          <Input
            id="slug"
            name="slug"
            required
            maxLength={60}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(toSlug(e.target.value));
            }}
            placeholder="iron-temple"
          />
          <p className="text-xs text-muted-foreground">
            Interno y permanente. Minúsculas, números y guiones.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner_email">Correo del dueño *</Label>
          <Input
            id="owner_email"
            name="owner_email"
            type="email"
            required
            placeholder="dueno@gimnasio.com"
          />
          <p className="text-xs text-muted-foreground">
            Recibirá una invitación para poner su contraseña. Queda como
            administrador de su gimnasio.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner_name">Nombre del dueño</Label>
          <Input id="owner_name" name="owner_name" maxLength={160} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch_name">Primera sucursal</Label>
          <Input
            id="branch_name"
            name="branch_name"
            maxLength={120}
            defaultValue="Matriz"
          />
          <p className="text-xs text-muted-foreground">
            Sin sucursal no se puede abrir turno de caja, así que se crea una.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Select
              id="timezone"
              name="timezone"
              defaultValue="America/Mexico_City"
            >
              <option value="America/Mexico_City">Ciudad de México</option>
              <option value="America/Tijuana">Tijuana</option>
              <option value="America/Hermosillo">Hermosillo</option>
              <option value="America/Cancun">Cancún</option>
              <option value="America/Monterrey">Monterrey</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <Select id="currency" name="currency" defaultValue="MXN">
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
            </Select>
          </div>
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {state.ok}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
