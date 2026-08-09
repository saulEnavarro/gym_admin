"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/config";
import { requireSession } from "@/lib/auth/session";
import { fullName } from "@/lib/clients/helpers";

/** Roles de staff autorizados a invitar clientes al portal (mostrador). */
const INVITE_ROLES = ["admin", "manager", "receptionist"];

export type InviteState = {
  error: string | null;
  ok?: boolean;
  message?: string;
};

/**
 * Invita a un cliente al portal: crea su cuenta de auth (service role) y la
 * vincula a la ficha. El correo de invitación (con enlace para fijar contraseña)
 * lo envía Supabase Auth; en local se captura en Mailpit (:54324).
 */
export async function inviteClientToPortal(
  clientId: string,
  _prev: InviteState,
  _formData: FormData,
): Promise<InviteState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };
  if (!INVITE_ROLES.includes(membership.role)) {
    return { error: "No tienes permiso para invitar clientes al portal." };
  }

  const supabase = await createClient();
  // RLS garantiza que sólo se lee una ficha de la propia organización.
  const { data: client } = await supabase
    .from("clients")
    .select("id, org_id, email, first_name, last_name, user_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return { error: "Cliente no encontrado." };
  if (!client.email) {
    return {
      error: "La ficha no tiene correo. Agrega uno antes de invitar al portal.",
    };
  }
  if (client.user_id) {
    return {
      error: null,
      ok: true,
      message: "Este cliente ya tiene una cuenta de portal.",
    };
  }

  const admin = createAdminClient();

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
    client.email,
    {
      data: {
        account_type: "client",
        client_id: client.id,
        org_id: client.org_id,
        full_name: fullName(client),
      },
      redirectTo: `${siteUrl()}/portal/set-password`,
    },
  );

  if (error || !invited?.user) {
    // Falla típica: el correo ya pertenece a otra cuenta (staff u otra ficha).
    return {
      error:
        "No se pudo enviar la invitación. Verifica que el correo no tenga ya una cuenta.",
    };
  }

  // Vincula la cuenta a la ficha (con la identidad del staff → auditoría correcta).
  const { error: linkErr } = await supabase
    .from("clients")
    .update({
      user_id: invited.user.id,
      portal_invited_at: new Date().toISOString(),
    })
    .eq("id", client.id);

  if (linkErr) {
    return {
      error:
        "Se creó la cuenta pero no se pudo vincular a la ficha. Contacta a soporte.",
    };
  }

  revalidatePath(`/clients/${client.id}`);
  return {
    error: null,
    ok: true,
    message: "Invitación enviada al correo del cliente.",
  };
}
