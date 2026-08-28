import { createClient } from "@/lib/supabase/server";
import { supabaseBrowserUrl, supabaseServerUrl } from "@/lib/supabase/config";

/**
 * Genera una URL firmada temporal para un objeto de un bucket privado.
 * Devuelve null si no hay ruta o si la firma falla. RLS/políticas de Storage
 * siguen aplicando: sólo se firma lo que el usuario puede leer.
 */
export async function getSignedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return toBrowserOrigin(data.signedUrl);
}

/**
 * Traduce el origen de una URL firmada al que alcanza el NAVEGADOR.
 *
 * En desarrollo con Docker el servidor habla con Supabase por
 * `host.docker.internal`, y firma con ese origen; pero quien carga la imagen es
 * el navegador, que corre en el host y no resuelve ese nombre — la foto salía
 * rota con ERR_NAME_NOT_RESOLVED. La firma va en el query string y cubre la
 * ruta, no el host, así que cambiar el origen no la invalida.
 *
 * En producción ambas URLs son la misma y esta función no toca nada.
 */
function toBrowserOrigin(url: string): string {
  if (!supabaseBrowserUrl || supabaseServerUrl === supabaseBrowserUrl) return url;
  return url.startsWith(supabaseServerUrl)
    ? supabaseBrowserUrl + url.slice(supabaseServerUrl.length)
    : url;
}

export const CLIENT_PHOTOS_BUCKET = "client-photos";

/** Bucket privado de la marca: logo y foto del establecimiento. */
export const ORG_LOGOS_BUCKET = "org-logos";
