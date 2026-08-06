"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { closeCashSession, type CashFormState } from "@/app/(app)/cash/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Cerrando…" : "Cerrar turno y hacer arqueo"}
    </Button>
  );
}

/**
 * Arqueo a ciegas: ni este formulario ni la pantalla de caja muestran el
 * efectivo esperado. Si el cajero lo viera, teclearía esa misma cifra y el
 * control de diferencias no mediría nada. El esperado, el contado y la
 * diferencia se revelan en el corte una vez cerrado el turno.
 */
export function CloseSessionForm({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<CashFormState, FormData>(
    closeCashSession,
    { error: null },
  );

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <LockKeyhole className="h-4 w-4" />
        Cerrar turno
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="w-full space-y-4 rounded-md border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="session_id" value={sessionId} />

      <div>
        <p className="font-medium">Arqueo de caja</p>
        <p className="text-sm text-muted-foreground">
          Cuenta el efectivo del cajón y captura el total, sin consultar el
          sistema. Al cerrar verás el corte con lo esperado y la diferencia.
        </p>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="counted_cash">Efectivo contado *</Label>
        <Input
          id="counted_cash"
          name="counted_cash"
          type="number"
          min={0}
          step={0.01}
          required
          autoFocus
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="close_notes">Observaciones (opcional)</Label>
        <Textarea
          id="close_notes"
          name="notes"
          rows={2}
          maxLength={500}
          placeholder="Explica cualquier diferencia…"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Volver
        </Button>
      </div>
    </form>
  );
}
