"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerateAccessToken } from "@/app/(app)/access/actions";

/**
 * Revoca el QR de acceso del socio emitiendo uno nuevo.
 *
 * Es el control práctico contra el préstamo de credencial: como el socio puede
 * (y debe poder) guardar una captura del QR para entrar sin internet, la única
 * forma de cortar una captura que anda circulando es invalidarla. El socio ve
 * el código nuevo la próxima vez que abra su portal.
 */
export function RevokeAccessQrButton({
  clientId,
  hasToken,
}: {
  clientId: string;
  hasToken: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        QR regenerado: el anterior dejó de servir.
      </span>
    );
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <QrCode className="h-4 w-4" />
        {hasToken ? "Revocar y regenerar QR" : "Generar QR de acceso"}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-xs text-muted-foreground">
        {hasToken
          ? "El QR actual dejará de abrir la puerta, incluidas las capturas que el socio haya compartido. Verá el nuevo al abrir su portal."
          : "Se emitirá un QR de acceso para este socio."}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                await regenerateAccessToken(clientId);
                setDone(true);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "No se pudo regenerar el QR.",
                );
              }
            })
          }
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Regenerando…" : "Confirmar"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancelar
        </Button>
      </div>
      {error && (
        <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}
