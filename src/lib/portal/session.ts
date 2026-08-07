import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  OrgBranding,
  Organization,
} from "@/lib/types/database.types";

/**
 * Contexto del usuario del PORTAL (cliente final). Espejo de
 * `src/lib/auth/session.ts` (staff), pero resuelve la identidad por la ficha
 * vinculada (`clients.user_id`) en vez de por `org_members`. Todas las consultas
 * pasan por RLS: sólo devuelven la ficha propia y su organización.
 */
export type PortalContext = {
  user: User;
  client: Client;
  organization: Organization | null;
  branding: OrgBranding | null;
};

export async function getPortalContext(): Promise<PortalContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS (política auto-acotada de 0016) sólo deja ver la ficha propia.
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // Cuenta de portal sin ficha vinculada (no debería ocurrir) → sin contexto.
  if (!client) return null;

  const [{ data: organization }, { data: branding }] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .eq("id", client.org_id)
      .maybeSingle(),
    supabase
      .from("org_branding")
      .select("*")
      .eq("org_id", client.org_id)
      .maybeSingle(),
  ]);

  return { user, client: client as Client, organization, branding };
}

/** Igual que getPortalContext pero redirige al login del portal si no hay sesión. */
export async function requirePortalSession(): Promise<PortalContext> {
  const ctx = await getPortalContext();
  if (!ctx) redirect("/portal/login");
  return ctx;
}
