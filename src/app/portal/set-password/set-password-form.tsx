"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_LEN = 8;

/**
 * Fija la contraseña tras la invitación. El enlace del correo establece una
 * sesión temporal (el cliente de navegador la detecta en la URL); con ella se
 * llama a updateUser({ password }). Al terminar, redirige al portal.
 */
export function SetPasswordForm({ redirectTo = "/portal" }: { redirectTo?: string } = {}) {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // Verifica que el enlace de invitación haya establecido sesión.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setReady(Boolean(data.session));
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password.length < MIN_LEN) {
      setError(`La contraseña debe tener al menos ${MIN_LEN} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateErr) {
      setError("No se pudo guardar la contraseña. Solicita una nueva invitación.");
      return;
    }
    setDone(true);
    router.replace(redirectTo);
  }

  if (ready === false) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Este enlace no es válido o ya expiró. Pide a tu gimnasio que te reenvíe la
        invitación.
      </div>
    );
  }

  if (ready === null) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar contraseña</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending || done}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {done && <CheckCircle2 className="h-4 w-4" />}
        {pending ? "Guardando…" : done ? "Listo" : "Guardar y entrar"}
      </Button>
    </form>
  );
}
