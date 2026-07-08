import { createClient } from "@/lib/supabase/server";

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
  return data.signedUrl;
}

export const CLIENT_PHOTOS_BUCKET = "client-photos";
