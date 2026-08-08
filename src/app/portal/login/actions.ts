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

/**
 * IP del cliente a partir de las cabeceras del proxy (mejor esfuerzo).
 *
 * ⚠️ `x-forwarded-for` sólo es de fiar detrás de un proxy que la FIJE (Vercel
 * lo hace). Si algún día esto se despliega sin un proxy de confianza al frente,
 * la cabecera es falsificable y el contador por IP se evade rotándola; ahí
 * habría que tomar la IP del socket en su lugar.
 */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}

/** «5 segundos», «2 minutos» — para decirle al cliente cuánto falta exactamente. */
function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundo${seconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
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

  // Espera pendiente por intentos fallidos. No es un portazo: es un retraso que
  // crece con los fallos de ESTA cuenta y se borra al entrar bien. Por IP sólo
  // frena cuando hay fallos contra muchas cuentas distintas (password-spray),
  // para que los socios que comparten el WiFi del gimnasio no se estorben.
  const delayArgs: RpcArgsNullable<"login_retry_delay", "p_ip"> = {
    p_email: email,
    p_ip: ip,
  };
  const { data: wait } = await admin.rpc(
    "login_retry_delay",
    delayArgs as RpcArgs<"login_retry_delay">,
  );
  if (typeof wait === "number" && wait > 0) {
    return {
      error: `Demasiados intentos fallidos. Espera ${formatWait(
        wait,
      )} e inténtalo de nuevo.`,
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
