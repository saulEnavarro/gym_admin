"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RpcArgs, RpcArgsNullable } from "@/lib/types/database.types";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
  redirectTo: z.string().optional(),
});

export type PortalLoginState = { error: string | null };

/** IP del cliente a partir de las cabeceras del proxy (mejor esfuerzo). */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}

/**
 * Login del portal (correo + contraseña) con rate-limiting / anti-fuerza bruta
 * (barandilla #4). Antes de autenticar consulta is_login_locked(); registra cada
 * intento con register_login_attempt(). Ambas via service role (la tabla está
 * cerrada por RLS). Se apoya además en el rate-limiting nativo de Supabase Auth.
 */
export async function portalLogin(
  _prev: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email, password } = parsed.data;
  const ip = await clientIp();
  const admin = createAdminClient();

  // Bloqueo por exceso de intentos fallidos (email o IP).
  const lockedArgs: RpcArgsNullable<"is_login_locked", "p_ip"> = {
    p_email: email,
    p_ip: ip,
  };
  const { data: locked } = await admin.rpc(
    "is_login_locked",
    lockedArgs as RpcArgs<"is_login_locked">,
  );
  if (locked) {
    return {
      error:
        "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Registrar el intento (limpia el historial de fallos si fue exitoso).
  const attemptArgs: RpcArgsNullable<"register_login_attempt", "p_ip"> = {
    p_email: email,
    p_ip: ip,
    p_ok: !error,
  };
  await admin.rpc(
    "register_login_attempt",
    attemptArgs as RpcArgs<"register_login_attempt">,
  );

  if (error) {
    // Mensaje genérico (anti-enumeración de cuentas).
    return { error: "Correo o contraseña incorrectos." };
  }

  // Sólo destinos internos del portal (evita open-redirect).
  const target = parsed.data.redirectTo;
  const safeTarget =
    target && target.startsWith("/portal") && !target.startsWith("//")
      ? target
      : "/portal";

  redirect(safeTarget);
}
