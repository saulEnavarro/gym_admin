import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { PlanForm } from "@/components/memberships/plan-form";
import { updatePlan } from "../../actions";
import type { MembershipPlan } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Editar membresía" };

export default async function EditMembershipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { branding } = await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from("membership_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!plan) notFound();
  const p = plan as MembershipPlan;

  const action = updatePlan.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/memberships"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Membresías
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Editar {p.name}
        </h1>
      </div>

      <PlanForm
        action={action}
        plan={p}
        currency={branding?.currency ?? "MXN"}
        locale={branding?.locale ?? "es-MX"}
        cancelHref="/memberships"
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
