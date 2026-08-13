"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { parseClientsFromFile } from "@/lib/clients/import";
import type { ClientInsert, TablesInsert } from "@/lib/types/database.types";

/** Roles de mostrador autorizados a dar de alta clientes. */
const IMPORT_ROLES = ["admin", "manager", "receptionist"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const CHUNK = 200;

export type ImportState = {
  error: string | null;
  ok?: boolean;
  imported?: number;
  skipped?: number;
};

function* chunk<T>(arr: T[], size: number): Generator<T[]> {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

/**
 * Importa clientes desde un archivo .xlsx/.csv a la organización de la sesión.
 * El número de socio lo asigna el trigger `assign_client_number`. No se marca
 * consentimiento LFPDPPP: son altas masivas y el consentimiento se gestiona
 * aparte, así que `data_consent_at` queda nulo (honesto) hasta capturarlo.
 */
export async function importClients(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { user, membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };
  if (!IMPORT_ROLES.includes(membership.role)) {
    return { error: "No tienes permiso para importar clientes." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo .xlsx o .csv." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "El archivo supera el tamaño máximo de 5 MB." };
  }
  if (!/\.(xlsx|csv)$/i.test(file.name)) {
    return { error: "Formato no soportado. Usa .xlsx o .csv." };
  }

  let parsed;
  try {
    parsed = await parseClientsFromFile(file);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo leer el archivo.",
    };
  }
  if (parsed.rows.length === 0) {
    return { error: "No encontré clientes con nombre en el archivo." };
  }

  const supabase = await createClient();
  const inserts: ClientInsert[] = parsed.rows.map((r) => ({
    org_id: membership.org_id,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email ?? null,
    mobile_phone: r.mobile_phone ?? null,
    created_by: user.id,
  }));

  // Se insertan por lotes; RLS exige rol de staff en la org (política de 0010).
  let imported = 0;
  for (const batch of chunk(inserts, CHUNK)) {
    const { error } = await supabase
      .from("clients")
      .insert(batch as TablesInsert<"clients">[]);
    if (error) {
      return {
        error: `Se importaron ${imported} y falló un lote: ${error.message}`,
        imported,
      };
    }
    imported += batch.length;
  }

  revalidatePath("/clients");
  return { error: null, ok: true, imported, skipped: parsed.skipped };
}
