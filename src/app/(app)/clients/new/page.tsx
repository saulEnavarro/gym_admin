import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { ClientForm } from "@/components/clients/client-form";
import { createClientRecord } from "../actions";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewClientPage() {
  await requireSession();
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/clients"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo cliente</h1>
      </div>

      <ClientForm
        action={createClientRecord}
        branches={branches ?? []}
        cancelHref="/clients"
        submitLabel="Registrar cliente"
      />
    </div>
  );
}
