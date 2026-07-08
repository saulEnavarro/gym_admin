import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { ClientForm } from "@/components/clients/client-form";
import { formatMemberNumber, fullName } from "@/lib/clients/helpers";
import { updateClientRecord } from "../../actions";
import type { Client } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: branches }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("branches")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (!client) notFound();
  const c = client as Client;

  const action = updateClientRecord.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/clients/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {fullName(c)} · {formatMemberNumber(c.member_number)}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Editar cliente</h1>
      </div>

      <ClientForm
        action={action}
        branches={branches ?? []}
        client={c}
        cancelHref={`/clients/${id}`}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
