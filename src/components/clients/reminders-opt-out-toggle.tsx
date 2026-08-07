"use client";

import { useTransition } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleClientReminders } from "@/app/(app)/clients/actions";

/**
 * Activa/desactiva los recordatorios por correo del cliente (opt-out).
 * `optOut = true` → el cliente NO recibe recordatorios.
 */
export function RemindersOptOutToggle({
  id,
  optOut,
}: {
  id: string;
  optOut: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleClientReminders(id, !optOut);
        })
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : optOut ? (
        <BellOff className="h-4 w-4" />
      ) : (
        <BellRing className="h-4 w-4" />
      )}
      {optOut ? "Activar recordatorios" : "Desactivar recordatorios"}
    </Button>
  );
}
