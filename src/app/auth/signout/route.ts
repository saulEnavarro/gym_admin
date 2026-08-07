import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierra la sesión y redirige. Por defecto a /login (staff); el portal envía
 * un campo `redirectTo=/portal/login`. Sólo se permiten destinos internos.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  let target = "/login";
  try {
    const form = await request.formData();
    const requested = form.get("redirectTo");
    if (
      typeof requested === "string" &&
      requested.startsWith("/") &&
      !requested.startsWith("//")
    ) {
      target = requested;
    }
  } catch {
    // Sin cuerpo de formulario: se usa el destino por defecto.
  }

  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}
