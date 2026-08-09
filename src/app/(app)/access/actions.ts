"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";
import { getSignedUrl, CLIENT_PHOTOS_BUCKET } from "@/lib/storage";
import { EMPTY_RESULT, type AccessResult } from "@/lib/access/helpers";
import type { RpcArgs, RpcArgsNullable } from "@/lib/types/database.types";

const schema = z.object({
  mode: z.enum(["in", "out"]).default("in"),
  token: z.preprocess(emptyToUndefined, z.string().max(200).optional()),
  client_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  branch_id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  override_reason: z.preprocess(
    emptyToUndefined,
    z.string().max(300).optional(),
  ),
});

/**
 * Registra una entrada o salida. Toda la decisión (vigencia, duplicados,
 * autorización) la toma la base en check_in/check_out; aquí sólo se traduce el
 * veredicto y se firma la foto del socio, que es lo que le permite al
 * recepcionista ver si quien pasa es de verdad el dueño del QR.
 */
export async function registerAccess(
  _prev: AccessResult,
  formData: FormData,
): Promise<AccessResult> {
  const { membership } = await requireSession();
  if (!membership) return { ...EMPTY_RESULT, error: "Tu cuenta no tiene organización." };

  const parsed = schema.safeParse({
    mode: formData.get("mode") ?? "in",
    token: formData.get("token"),
    client_id: formData.get("client_id"),
    branch_id: formData.get("branch_id"),
    override_reason: formData.get("override_reason"),
  });
  if (!parsed.success) {
    return { ...EMPTY_RESULT, error: "Datos inválidos." };
  }
  const d = parsed.data;

  if (!d.token && !d.client_id) {
    return { ...EMPTY_RESULT, error: "Escanea un código o elige un socio." };
  }

  const supabase = await createSupabaseClient();

  const raw =
    d.mode === "out"
      ? await (async () => {
          const args: RpcArgsNullable<"check_out", "p_token" | "p_client"> = {
            p_token: d.token ?? null,
            p_client: d.client_id ?? null,
          };
          return supabase.rpc("check_out", args as RpcArgs<"check_out">);
        })()
      : await (async () => {
          const args: RpcArgsNullable<
            "check_in",
            "p_token" | "p_client" | "p_branch" | "p_override_reason"
          > = {
            p_token: d.token ?? null,
            p_client: d.client_id ?? null,
            p_branch: d.branch_id ?? null,
            p_override_reason: d.override_reason ?? null,
          };
          return supabase.rpc("check_in", args as RpcArgs<"check_in">);
        })();

  if (raw.error) {
    return { ...EMPTY_RESULT, error: businessMessage(raw.error.message) };
  }

  const r = (raw.data ?? {}) as Record<string, unknown>;
  const client = (r.client ?? null) as
    | (AccessResult["client"] & { photo_url: string | null })
    | null;

  revalidatePath("/access");

  return {
    status: (r.status as AccessResult["status"]) ?? null,
    reason: (r.reason as string | null) ?? null,
    days: r.days == null ? null : Number(r.days),
    minutes: r.minutes == null ? null : Number(r.minutes),
    client: client
      ? {
          id: client.id,
          member_number: client.member_number,
          first_name: client.first_name,
          last_name: client.last_name,
        }
      : null,
    membership: (r.membership as AccessResult["membership"]) ?? null,
    photoUrl: await getSignedUrl(CLIENT_PHOTOS_BUCKET, client?.photo_url, 300),
    error: null,
  };
}

/** Emite un QR nuevo para el socio e invalida el anterior (revocación). */
export async function regenerateAccessToken(clientId: string) {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.rpc("issue_access_token", {
    p_client: clientId,
  });
  if (error) throw new Error(businessMessage(error.message));
  revalidatePath(`/clients/${clientId}`);
}

function businessMessage(msg: string | undefined): string {
  if (!msg) return "Ocurrió un error al registrar el acceso.";
  const technical =
    /row-level security|violates|constraint|permission denied|null value|invalid input|syntax/i;
  return technical.test(msg) ? "No se pudo registrar el acceso." : msg;
}
