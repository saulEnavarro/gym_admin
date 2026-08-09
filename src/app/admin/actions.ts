"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/config";
import { emptyToUndefined } from "@/lib/forms";

export type ProvisionState = {
  error: string | null;
  ok?: string | null;
};

const schema = z.object({
  name: z.string().trim().min(2, "El nombre del gimnasio es obligatorio").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "El identificador sólo admite minúsculas, números y guiones",
    )
    .max(60),
  owner_email: z.string().email("Correo del dueño inválido"),
  owner_name: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
  branch_name: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
  timezone: z.string().max(60).default("America/Mexico_City"),
  currency: z.string().length(3).default("MXN"),
});

/**
 * Da de alta un gimnasio con su dueño.
 *
 * El orden importa: primero se crea (o se localiza) la cuenta de auth del
 * dueño, y sólo después se arma la organización. Si se hiciera al revés y
 * fallara el correo, quedaría un gimnasio huérfano que nadie puede administrar.
 */
export async function provisionOrganization(
  _prev: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  // La comprobación se hace con la sesión REAL del usuario, no con el cliente
  // de servicio: es la sesión la que dice quién es.
  const supabase = await createSupabaseClient();
  const { data: isPlatform } = await supabase.rpc("is_platform_admin");
  if (!isPlatform) {
    return { error: "No tienes acceso a la administración de la plataforma." };
  }

  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    owner_email: formData.get("owner_email"),
    owner_name: formData.get("owner_name"),
    branch_name: formData.get("branch_name"),
    timezone: formData.get("timezone") ?? "America/Mexico_City",
    currency: formData.get("currency") ?? "MXN",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;

  const admin = createAdminClient();

  // 1. Cuenta del dueño. Si ya existe (porque es dueño de otro gimnasio), se
  //    reutiliza en vez de fallar.
  let ownerId: string | null = null;
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(d.owner_email, {
      data: { full_name: d.owner_name ?? d.name, account_type: "staff" },
      redirectTo: `${siteUrl()}/set-password`,
    });

  if (invited?.user) {
    ownerId = invited.user.id;
  } else if (inviteError && /already been registered|already exists/i.test(inviteError.message)) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    ownerId =
      list?.users.find(
        (u) => u.email?.toLowerCase() === d.owner_email.toLowerCase(),
      )?.id ?? null;
    if (!ownerId) {
      return {
        error:
          "Ese correo ya existe pero no se pudo localizar la cuenta. Revísalo en Supabase.",
      };
    }
  } else {
    return {
      error: inviteError?.message ?? "No se pudo crear la cuenta del dueño.",
    };
  }

  // 2. La organización, su sucursal y el dueño como administrador, en una sola
  //    transacción dentro de la base.
  const { data: orgId, error } = await supabase.rpc("provision_organization", {
    p_name: d.name,
    p_slug: d.slug,
    p_owner: ownerId,
    p_branch_name: d.branch_name ?? "Matriz",
    p_timezone: d.timezone,
    p_currency: d.currency,
  });

  if (error || !orgId) {
    return {
      error:
        error?.message ??
        "No se pudo crear el gimnasio. La cuenta del dueño sí quedó creada.",
    };
  }

  revalidatePath("/admin");
  return {
    error: null,
    ok: `«${d.name}» quedó dado de alta. Se envió la invitación a ${d.owner_email} para que ponga su contraseña.`,
  };
}
