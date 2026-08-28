"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePlan } from "@/app/(app)/memberships/actions";

/**
 * Borra una membresía capturada por error. Pide confirmación en el sitio (sin
 * diálogo del navegador) porque el borrado no se puede deshacer, y muestra el
 * motivo cuando el servidor lo rechaza — normalmente, que el plan ya se vendió.
 */
export function DeletePlanButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-sm font-medium text-destructive underline-offset-4 hover:underline"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1">
      <span className="text-xs text-muted-foreground">
        ¿Eliminar <strong className="text-foreground">{name}</strong>?
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await deletePlan(id);
            // Si sale bien, la fila desaparece al revalidar y este componente
            // se desmonta; sólo hay que atender el caso de error.
            if (result.error) setError(result.error);
          })
        }
        className="text-sm font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-50"
      >
        {pending ? "Eliminando…" : "Sí"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
      >
        Cancelar
      </button>
      {error && (
        <p
          role="alert"
          className="w-full text-left text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </span>
  );
}
