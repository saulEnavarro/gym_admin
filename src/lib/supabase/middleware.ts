import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import {
  SUPABASE_STORAGE_KEY,
  supabaseAnonKey,
  supabaseServerUrl,
} from "./config";

/** Rutas del panel de STAFF accesibles sin sesión. */
const STAFF_PUBLIC_PATHS = ["/", "/login", "/auth"];
/** Rutas del PORTAL accesibles sin sesión (o para fijar contraseña tras invitar). */
const PORTAL_PUBLIC_PATHS = ["/portal/login", "/portal/set-password"];

function matchesPath(pathname: string, list: string[]): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isPortalPath(pathname: string): boolean {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

/** account_type del usuario (default 'staff' si no se puede leer el perfil). */
async function accountTypeOf(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<"staff" | "client"> {
  const { data } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  return data?.account_type === "client" ? "client" : "staff";
}

/**
 * Refresca la sesión de Supabase en cada petición (rota refresh tokens) y aplica
 * la protección de rutas separando dos superficies:
 *   · Staff  → `/dashboard`, `/clients`, … (login en `/login`).
 *   · Cliente → `/portal/*` (login en `/portal/login`).
 * Un usuario de un tipo que entra a la superficie del otro es redirigido a su
 * propio inicio. Llamado desde src/middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseServerUrl, supabaseAnonKey, {
    auth: { storageKey: SUPABASE_STORAGE_KEY },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: getUser() revalida el token contra el servidor de Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const portal = isPortalPath(pathname);
  const portalPublic = matchesPath(pathname, PORTAL_PUBLIC_PATHS);
  const staffPublic = !portal && matchesPath(pathname, STAFF_PUBLIC_PATHS);

  // ── Sin sesión ───────────────────────────────────────────────────────────
  if (!user) {
    if (portal && !portalPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    if (!portal && !staffPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ── Con sesión: enrutar según el tipo de cuenta ────────────────────────────
  const accountType = await accountTypeOf(supabase, user.id);

  if (accountType === "client") {
    // El cliente vive en /portal (y la landing "/"); todo lo demás → /portal.
    if (pathname === "/portal/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
    if (!portal && pathname !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Staff: no entra al portal; en /login → al panel.
  if (portal) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
