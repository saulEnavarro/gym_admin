"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/config";
import { requireSession } from "@/lib/auth/session";
import { emptyToUndefined } from "@/lib/forms";

export type TeamFormState = { error: string | null; ok?: string | null };

const STAFF_ROLES = ["admin", "manager", "receptionist", "instructor"] as const;

const inviteSchema = z.object({
  email: z.string().email("Correo inválido"),
  full_name: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  role: z.enum(STAFF_ROLES),
  branch_ids: z.array(z.string().uuid()).default([]),
});

/**
 * Invita a alguien al equipo del gimnasio.
 *
 * Se crea (o reutiliza) su cuenta de auth con la API de administración —que es
 * la que manda el correo— y después se le da de alta como miembro con su rol.
 * El alta del miembro pasa por RLS con la sesión real: sólo un administrador
 * del gimnasio puede hacerlo, y sólo en SU organización.
 */
export async function inviteTeamMember(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
    branch_ids: formData.getAll("branch_ids").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  const admin = createAdminClient();
  let userId: string | null = null;

  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(d.email, {
      data: { full_name: d.full_name ?? d.email, account_type: "staff" },
      redirectTo: `${siteUrl()}/set-password`,
    });

  if (invited?.user) {
    userId = invited.user.id;
  } else if (
    inviteError &&
    /already been registered|already exists/i.test(inviteError.message)
  ) {
    // Ya tenía cuenta (por ejemplo, trabaja en otra sucursal o en otro
    // gimnasio): se reutiliza en vez de fallar.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    userId =
      list?.users.find((u) => u.email?.toLowerCase() === d.email.toLowerCase())
        ?.id ?? null;
    if (!userId) {
      return { error: "Ese correo ya existe pero no se pudo localizar." };
    }
  } else {
    return { error: inviteError?.message ?? "No se pudo enviar la invitación." };
  }

  const supabase = await createSupabaseClient();
  const { data: member, error } = await supabase
    .from("org_members")
    .insert({ org_id: membership.org_id, user_id: userId, role: d.role })
    .select("id")
    .single();

  if (error || !member) {
    if (/duplicate key|unique/i.test(error?.message ?? "")) {
      return { error: "Esa persona ya forma parte de tu equipo." };
    }
    return { error: permissionMessage(error?.message) };
  }

  if (d.branch_ids.length > 0) {
    await supabase.from("member_branches").insert(
      d.branch_ids.map((branch_id) => ({ member_id: member.id, branch_id })),
    );
  }

  revalidatePath("/team");
  return {
    error: null,
    ok: `Invitación enviada a ${d.email}. Podrá entrar en cuanto ponga su contraseña.`,
  };
}

const updateSchema = z.object({
  member_id: z.string().uuid(),
  role: z.enum(STAFF_ROLES),
  is_active: z.coerce.boolean(),
  branch_ids: z.array(z.string().uuid()).default([]),
});

/** Cambia el rol, el estado y las sucursales asignadas de un miembro. */
export async function updateTeamMember(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const { user } = await requireSession();

  const parsed = updateSchema.safeParse({
    member_id: formData.get("member_id"),
    role: formData.get("role"),
    is_active: formData.get("is_active") === "on",
    branch_ids: formData.getAll("branch_ids").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createSupabaseClient();

  // Quitarse a uno mismo el rol de administrador deja al gimnasio sin quien lo
  // administre y sin forma de recuperarlo desde la aplicación.
  const { data: target } = await supabase
    .from("org_members")
    .select("user_id, role")
    .eq("id", d.member_id)
    .maybeSingle();

  if (
    target?.user_id === user.id &&
    (d.role !== "admin" || !d.is_active)
  ) {
    return {
      error:
        "No puedes quitarte a ti mismo el rol de administrador: quedarías fuera de la configuración.",
    };
  }

  const { error } = await supabase
    .from("org_members")
    .update({ role: d.role, is_active: d.is_active })
    .eq("id", d.member_id);

  if (error) return { error: permissionMessage(error.message) };

  // Las sucursales se reemplazan completas: es más simple de razonar que
  // calcular altas y bajas, y son pocas filas.
  await supabase.from("member_branches").delete().eq("member_id", d.member_id);
  if (d.branch_ids.length > 0) {
    await supabase.from("member_branches").insert(
      d.branch_ids.map((branch_id) => ({ member_id: d.member_id, branch_id })),
    );
  }

  revalidatePath("/team");
  return { error: null, ok: "Cambios guardados." };
}

function permissionMessage(msg: string | undefined): string {
  if (!msg) return "No se pudo completar la operación.";
  if (/row-level security|permission denied/i.test(msg)) {
    return "Sólo un administrador puede administrar el equipo.";
  }
  return /violates|constraint|null value|syntax/i.test(msg)
    ? "No se pudo completar la operación."
    : msg;
}
