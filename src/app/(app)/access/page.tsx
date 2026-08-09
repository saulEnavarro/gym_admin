import type { Metadata } from "next";
import { DoorOpen, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { AccessTerminal } from "@/components/access/access-terminal";
import { AutoRefresh } from "@/components/access/auto-refresh";
import { formatMemberNumber } from "@/lib/clients/helpers";
import { formatStay } from "@/lib/access/helpers";
import type { Client } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Acceso" };

// La recepción necesita ver el estado del momento, no una copia en caché.
export const dynamic = "force-dynamic";

type OpenVisit = {
  id: string;
  client_id: string;
  entered_at: string;
};

export default async function AccessPage() {
  await requireSession();
  const supabase = await createClient();

  const { data: allowed } = await supabase.rpc("current_user_branch_ids");
  const ids = allowed ?? [];

  const [{ data: branches }, { data: clients }, { data: openVisits }] =
    await Promise.all([
      ids.length
        ? supabase
            .from("branches")
            .select("id, name")
            .eq("is_active", true)
            .in("id", ids)
            .order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase
        .from("clients")
        .select("id, member_number, first_name, last_name")
        .eq("is_active", true)
        .order("member_number", { ascending: false })
        .limit(1000),
      supabase
        .from("access_logs")
        .select("id, client_id, entered_at")
        .is("exited_at", null)
        .order("entered_at", { ascending: false })
        .limit(200),
    ]);

  const visits = (openVisits ?? []) as OpenVisit[];
  const byId = new Map(
    ((clients ?? []) as Pick<
      Client,
      "id" | "member_number" | "first_name" | "last_name"
    >[]).map((c) => [c.id, c]),
  );
  const now = Date.now();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <DoorOpen className="h-6 w-6 text-primary" />
          Acceso
        </h1>
        <p className="text-muted-foreground">
          Entrada y salida de socios por QR o a mano.
        </p>
      </div>

      {/* La pantalla de recepción se queda abierta todo el día: se refresca
          sola en vez de mantener una suscripción en vivo (ver AutoRefresh). */}
      <AutoRefresh seconds={60} />

      <AccessTerminal clients={clients ?? []} branches={branches ?? []} />

      {/* Quién está dentro: se pinta al cargar, al registrar cada acceso y
          cada minuto por el refresco automático. */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              Dentro ahora
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
              {visits.length}
            </span>
          </div>

          {visits.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No hay nadie dentro en este momento.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visits.map((v) => {
                const c = byId.get(v.client_id);
                const mins = Math.max(
                  0,
                  Math.round((now - new Date(v.entered_at).getTime()) / 60000),
                );
                return (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {c ? (
                        <>
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatMemberNumber(c.member_number)}
                          </span>{" "}
                          {c.first_name} {c.last_name}
                        </>
                      ) : (
                        "Socio"
                      )}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(v.entered_at).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {formatStay(mins)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
