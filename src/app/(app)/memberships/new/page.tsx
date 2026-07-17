import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { PlanForm } from "@/components/memberships/plan-form";
import { createPlan } from "../actions";

export const metadata: Metadata = { title: "Nueva membresía" };

export default async function NewMembershipPage() {
  const { branding } = await requireSession();

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
        <h1 className="text-2xl font-bold tracking-tight">Nueva membresía</h1>
      </div>

      <PlanForm
        action={createPlan}
        currency={branding?.currency ?? "MXN"}
        locale={branding?.locale ?? "es-MX"}
        cancelHref="/memberships"
        submitLabel="Crear membresía"
      />
    </div>
  );
}
