import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { arqueoVerdict, sessionDuration } from "@/lib/cash/helpers";
import type { CashSession, Profile } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Cortes de caja" };

export default async function CashSessionsPage() {
  const { branding } = await requireSession();
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";
  const money = (n: number) => formatCurrency(n, currency, locale);

  // RLS acota los turnos a la organización del usuario.
  const { data } = await supabase
    .from("cash_sessions")
    .select("*")
    .order("opened_at", { ascending: false })
    .limit(200);
  const sessions = (data ?? []) as CashSession[];

  // Nombre del cajero de cada turno, en un solo query.
  const userIds = [...new Set(sessions.map((s) => s.opened_by))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameById = new Map(
    ((profiles ?? []) as Pick<Profile, "id" | "full_name">[]).map((p) => [
      p.id,
      p.full_name,
    ]),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/cash"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Caja
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cortes de caja</h1>
        <p className="text-muted-foreground">
          Historial de turnos con su arqueo y diferencias.
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <History className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aún no hay turnos registrados.
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
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Cajero</th>
                    <th className="px-4 py-3 font-medium">Duración</th>
                    <th className="px-4 py-3 text-right font-medium">Fondo</th>
                    <th className="px-4 py-3 text-right font-medium">Contado</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Diferencia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const isOpen = s.status === "open";
                    const diff = Number(s.difference ?? 0);
                    const verdict = arqueoVerdict(diff);
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border/60 last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/cash/sessions/${s.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {new Date(s.opened_at).toLocaleDateString(locale)}
                          </Link>
                          <span className="block text-xs text-muted-foreground">
                            {new Date(s.opened_at).toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {nameById.get(s.opened_by) ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {sessionDuration(s.opened_at, s.closed_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {money(s.opening_float)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isOpen ? "—" : money(Number(s.counted_cash ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isOpen ? (
                            <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                              Abierto
                            </span>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                verdict.tone === "ok" &&
                                  "bg-success/10 text-success",
                                verdict.tone === "short" &&
                                  "bg-destructive/10 text-destructive",
                                verdict.tone === "over" &&
                                  "bg-primary/10 text-primary",
                              )}
                            >
                              {verdict.tone === "ok"
                                ? verdict.label
                                : `${verdict.label} ${money(Math.abs(diff))}`}
                            </span>
                          )}
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
    </div>
  );
}
