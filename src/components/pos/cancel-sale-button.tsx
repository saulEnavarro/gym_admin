"use client";

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cancelSale } from "@/app/(app)/pos/actions";

export function CancelSaleButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" />
        Cancelar venta
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm font-medium">
        Cancelar la venta reintegra el importe y revierte la membresía otorgada.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Textarea
        rows={2}
        maxLength={500}
        placeholder="Motivo de la cancelación (opcional)…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await cancelSale(id, reason);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "No se pudo cancelar.",
                );
              }
            })
          }
        >
          {pending ? "Cancelando…" : "Confirmar cancelación"}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Volver
        </Button>
      </div>
    </div>
  );
}
