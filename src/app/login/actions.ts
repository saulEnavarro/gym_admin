"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
  redirectTo: z.string().optional(),
});

export type LoginState = { error: string | null };

/** Inicia sesión del staff con correo y contraseña (Supabase Auth). */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Mensaje genérico para no revelar si el correo existe (anti-enumeración).
    return { error: "Correo o contraseña incorrectos." };
  }

  // Sólo permitimos redirecciones internas (evita open-redirect).
  const target = parsed.data.redirectTo;
  const safeTarget =
    target && target.startsWith("/") && !target.startsWith("//")
      ? target
      : "/dashboard";

  redirect(safeTarget);
}
