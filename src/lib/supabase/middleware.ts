import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  SUPABASE_STORAGE_KEY,
  supabaseAnonKey,
  supabaseServerUrl,
} from "./config";

/** Rutas accesibles sin sesión iniciada. */
const PUBLIC_PATHS = ["/", "/login", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Refresca la sesión de Supabase en cada petición (rota refresh tokens) y
 * aplica la protección de rutas. Llamado desde src/middleware.ts.
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
  // No usar getSession() aquí (no es de confianza en el servidor).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Sin sesión en ruta privada → a login (recordando el destino).
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión y yendo a /login → al dashboard.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
