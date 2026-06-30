import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";
import {
  SUPABASE_STORAGE_KEY,
  supabaseAnonKey,
  supabaseServerUrl,
} from "./config";

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 * Respeta la sesión del usuario (RLS aplica con su identidad) leyendo/escribiendo
 * las cookies de la petición.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseServerUrl, supabaseAnonKey, {
    auth: { storageKey: SUPABASE_STORAGE_KEY },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Invocado desde un Server Component: ignorar. El middleware ya
          // refresca la sesión y persiste las cookies.
        }
      },
    },
  });
}
