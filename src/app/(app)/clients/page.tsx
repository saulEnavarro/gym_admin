import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientsToolbar } from "@/components/clients/clients-toolbar";
import { ClientImportDropzone } from "@/components/clients/client-import-dropzone";
import { ClientsPagination } from "@/components/clients/clients-pagination";
import {
  ageFromBirthDate,
  formatMemberNumber,
  fullName,
  initials,
  resolvePage,
  resolvePageSize,
} from "@/lib/clients/helpers";
import type { Client } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Clientes" };

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
  per?: string;
}>;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSession();
  const { q = "", status = "all", page: pageParam, per } = await searchParams;
  const supabase = await createClient();

  // La paginación se resuelve en la base (range + count), no recortando en
  // memoria: con miles de fichas traerlas todas para tirar 50 no escala.
  const pageSize = resolvePageSize(per);
  const page = resolvePage(pageParam);
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("clients")
    .select(
      "id, member_number, first_name, last_name, birth_date, mobile_phone, phone, email, is_active",
      { count: "exact" },
    )
    // Orden alfabético A→Z. El nombre se muestra "Nombre Apellidos", así que se
    // ordena por nombre y luego por apellidos para desempatar homónimos.
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (status === "active") query = query.eq("is_active", true);
  else if (status === "inactive") query = query.eq("is_active", false);

  const term = q.trim();
  if (term) {
    const escaped = term.replace(/[%,()]/g, " ");
    const filters = [
      `first_name.ilike.%${escaped}%`,
      `last_name.ilike.%${escaped}%`,
      `email.ilike.%${escaped}%`,
    ];
    if (/^\d+$/.test(term)) filters.push(`member_number.eq.${term}`);
    query = query.or(filters.join(","));
  }

  const { data: clients, count } = await query;
  const total = count ?? 0;
  const rows = (clients ?? []) as Pick<
    Client,
    | "id"
    | "member_number"
    | "first_name"
    | "last_name"
    | "birth_date"
    | "mobile_phone"
    | "phone"
    | "email"
    | "is_active"
  >[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Registro y ficha de los clientes del gimnasio.
          </p>
        </div>
        <Link href="/clients/new" className={buttonVariants()}>
          <UserPlus className="h-4 w-4" />
          Nuevo cliente
        </Link>
      </div>

      <ClientImportDropzone />
      <ClientsToolbar />

      {total > 0 && (
        <ClientsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          shown={rows.length}
        />
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {term || status !== "all"
                ? "No hay clientes que coincidan con la búsqueda."
                : "Aún no hay clientes. Registra el primero."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Edad</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const age = ageFromBirthDate(c.birth_date);
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-border/60 last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {formatMemberNumber(c.member_number)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/clients/${c.id}`}
                            className="flex items-center gap-3 font-medium hover:text-primary"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {initials(c)}
                            </span>
                            {fullName(c)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {age ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.mobile_phone || c.phone || c.email || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge active={c.is_active} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repetida abajo: tras recorrer 200 filas, subir a paginar es un viaje. */}
      {total > pageSize && (
        <ClientsPagination
          page={page}
          pageSize={pageSize}
          total={total}
          shown={rows.length}
        />
      )}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Inactivo
    </span>
  );
}
