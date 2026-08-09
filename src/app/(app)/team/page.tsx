import type { Metadata } from "next";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { TeamManager, type TeamMember } from "@/components/team/team-manager";
import type { AppRole } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Equipo" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireSession();
  const supabase = await createClient();

  // RLS acota todo a la organización del usuario.
  const [{ data: members }, { data: branches }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("org_members")
        .select("id, user_id, role, is_active")
        .neq("role", "client")
        .order("created_at"),
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("member_branches").select("member_id, branch_id"),
    ]);

  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids)
    : { data: [] };

  const byUser = new Map((profiles ?? []).map((p) => [p.id, p]));
  const byMember = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    byMember.set(a.member_id, [...(byMember.get(a.member_id) ?? []), a.branch_id]);
  }

  const rows: TeamMember[] = (members ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role as AppRole,
    is_active: m.is_active,
    full_name: byUser.get(m.user_id)?.full_name ?? null,
    email: byUser.get(m.user_id)?.email ?? null,
    branch_ids: byMember.get(m.id) ?? [],
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="h-6 w-6 text-primary" />
          Equipo
        </h1>
        <p className="text-muted-foreground">
          Quién trabaja en el gimnasio, con qué permisos y en qué sucursales.
        </p>
      </div>

      <TeamManager members={rows} branches={branches ?? []} />
    </div>
  );
}
