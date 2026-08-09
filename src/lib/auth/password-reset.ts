"use server";

import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/config";

export type ResetState = { error: string | null; ok: boolean };

/**
 * Envía el correo de recuperación de contraseña.
 *
 * Responde SIEMPRE lo mismo, exista o no la cuenta: si dijera «ese correo no
 * está registrado», cualquiera podría averiguar quién es socio del gimnasio
 * probando direcciones. Es la misma razón por la que el login dice «correo o
 * contraseña incorrectos» sin precisar cuál.
 *
 * @param surface  A qué superficie vuelve el enlace: el panel o el portal.
 */
export async function requestPasswordReset(
  email: string,
  surface: "staff" | "portal",
): Promise<ResetState> {
  const clean = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { error: "Escribe un correo válido.", ok: false };
  }

  const supabase = await createClient();
  const redirectTo =
    surface === "portal"
      ? `${siteUrl()}/portal/set-password`
      : `${siteUrl()}/set-password`;

  await supabase.auth.resetPasswordForEmail(clean, { redirectTo });

  return { error: null, ok: true };
}
