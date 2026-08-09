"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelSaleItem } from "@/app/(app)/pos/actions";

/**
 * Quita una línea del ticket sin tirar el resto.
 *
 * El ticket conserva su folio: la línea se marca como cancelada y se devuelve
 * su parte proporcional del descuento. Los montos originales no se reescriben,
 * porque un turno de caja ya arqueado tiene que seguir cuadrando.
 */
export function CancelItemButton({
  saleId,
  itemId,
  description,
}: {
  saleId: string;
  itemId: string;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Cancelar ${description}`}
      >
        <Undo2 className="h-3.5 w-3.5" />
        Cancelar
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs text-muted-foreground">
        Se devolverá la parte proporcional de <strong>{description}</strong> y,
        si es un producto, regresará al inventario.
      </p>
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opcional)"
        maxLength={300}
        autoFocus
      />
      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await cancelSaleItem(saleId, itemId, reason);
              if (res.error) setError(res.error);
              else setOpen(false);
            })
          }
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {pending ? "Cancelando…" : "Confirmar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Volver
        </Button>
      </div>
    </div>
  );
}
