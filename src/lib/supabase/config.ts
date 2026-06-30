/**
 * Configuración compartida de los clientes Supabase.
 *
 * El `storageKey` se FIJA explícitamente para que el nombre de la cookie de
 * sesión NO dependa del hostname de la URL. Así, aunque el navegador use
 * `127.0.0.1` y el servidor (dentro del contenedor) use `host.docker.internal`,
 * ambos leen/escriben la MISMA cookie y la sesión se comparte correctamente.
 */
export const SUPABASE_STORAGE_KEY = "sb-registro-gym-auth";

export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** URL que usa el NAVEGADOR (corre en el host). */
export const supabaseBrowserUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * URL que usa el SERVIDOR. Si la app corre en un contenedor, SUPABASE_INTERNAL_URL
 * (host.docker.internal) permite alcanzar el stack de Supabase del host.
 */
export const supabaseServerUrl =
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
