"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth/password-reset";

/**
 * Pide el correo de recuperación.
 *
 * El mensaje de éxito es el mismo exista o no la cuenta, a propósito: si
 * dijera «ese correo no está registrado», cualquiera podría averiguar quién es
 * socio del gimnasio probando direcciones.
 */
export function ForgotPasswordForm({
  surface,
  loginHref,
}: {
  surface: "staff" | "portal";
  loginHref: string;
}) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-success" />
        <p className="text-sm">
          Si ese correo tiene una cuenta, le llegará un enlace para poner una
          contraseña nueva. Revisa también la carpeta de no deseados.
        </p>
        <Link href={loginHref} className="text-sm text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const email = String(new FormData(e.currentTarget).get("email") ?? "");
        start(async () => {
          setError(null);
          const res = await requestPasswordReset(email, surface);
          if (res.error) setError(res.error);
          else setSent(true);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Tu correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="tu@correo.com"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviarme el enlace"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href={loginHref} className="text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
