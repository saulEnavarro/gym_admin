"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Mail, UserCheck } from "lucide-react";
import {
  inviteClientToPortal,
  type InviteState,
} from "@/app/(app)/clients/[id]/actions";
import { Button } from "@/components/ui/button";

const initialState: InviteState = { error: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mail className="h-4 w-4" />
      )}
      {pending ? "Enviando…" : label}
    </Button>
  );
}

/**
 * Estado del portal de un cliente + acción de invitación.
 *  · linked  → ya tiene cuenta de portal (sólo se muestra el estado).
 *  · noEmail → falta correo en la ficha (no se puede invitar).
 *  · else    → botón para enviar la invitación.
 */
export function InvitePortalButton({
  clientId,
  linked,
  hasEmail,
}: {
  clientId: string;
  linked: boolean;
  hasEmail: boolean;
}) {
  const action = inviteClientToPortal.bind(null, clientId);
  const [state, formAction] = useActionState(action, initialState);

  if (linked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
        <UserCheck className="h-3.5 w-3.5" />
        Portal activo
      </span>
    );
  }

  if (!hasEmail) {
    return (
      <p className="text-xs text-muted-foreground">
        Agrega un correo a la ficha para poder invitar al portal.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <SubmitButton label="Invitar al portal" />
      {state.error && (
        <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {state.error}
        </span>
      )}
      {state.ok && state.message && (
        <span className="inline-flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {state.message}
        </span>
      )}
    </form>
  );
}
