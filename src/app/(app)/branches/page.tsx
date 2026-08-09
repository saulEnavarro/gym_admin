import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { BranchList } from "@/components/branches/branch-list";
import type { Branch } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Sucursales" };

export default async function BranchesPage() {
  await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("branches")
    .select("*")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Building2 className="h-6 w-6 text-primary" />
          Sucursales
        </h1>
        <p className="text-muted-foreground">
          Cada sucursal lleva su propio turno de caja, sus existencias y sus
          accesos.
        </p>
      </div>

      <BranchList branches={(data ?? []) as Branch[]} />
    </div>
  );
}
