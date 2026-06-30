import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Cierra la sesión y redirige a /login. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
