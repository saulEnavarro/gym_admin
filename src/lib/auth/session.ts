import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type {
  OrgBranding,
  OrgMember,
  Organization,
  Profile,
} from "@/lib/types/database.types";

export type SessionContext = {
  user: User;
  profile: Profile | null;
  /** Membresía activa del usuario (su org + rol). Fase 0 asume una org. */
  membership: OrgMember | null;
  organization: Organization | null;
  branding: OrgBranding | null;
};

/**
 * Resuelve el contexto del usuario autenticado. Todas las consultas pasan por
 * RLS con la identidad del usuario, así que sólo devuelven datos de SU org.
 * Devuelve null si no hay sesión.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("org_members")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let organization: Organization | null = null;
  let branding: OrgBranding | null = null;

  if (membership) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.org_id)
      .maybeSingle();

    const { data: brand } = await supabase
      .from("org_branding")
      .select("*")
      .eq("org_id", membership.org_id)
      .maybeSingle();

    organization = org;
    branding = brand;
  }

  return { user, profile, membership, organization, branding };
}

/** Igual que getSessionContext pero redirige a /login si no hay sesión. */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}
