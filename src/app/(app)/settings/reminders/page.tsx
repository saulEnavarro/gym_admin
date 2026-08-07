import type { Metadata } from "next";
import { BellRing, Inbox } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ReminderSettingsForm } from "@/components/reminders/reminder-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  REMINDER_OFFSET_LABELS,
  REMINDER_STATUS_LABELS,
  ALL_REMINDER_OFFSETS,
} from "@/lib/reminders/helpers";
import { cn } from "@/lib/utils";
import type {
  OrgReminderSettings,
  ReminderOffsetKey,
  ReminderOutbox,
} from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Recordatorios" };

export default async function RemindersSettingsPage() {
  const { membership } = await requireSession();
  const supabase = await createClient();
  const canManage =
    membership?.role === "admin" || membership?.role === "manager";

  const [{ data: settings }, { data: outbox }] = await Promise.all([
    supabase
      .from("org_reminder_settings")
      .select("*")
      .eq("org_id", membership!.org_id)
      .maybeSingle(),
    supabase
      .from("reminder_outbox")
      .select(
        "id, offset_key, due_on, email, status, sent_at, clients(first_name,last_name)",
      )
      .order("due_on", { ascending: false })
      .limit(50),
  ]);

  const s = settings as OrgReminderSettings | null;
  // Sin fila = todo habilitado (misma regla que enqueue_due_reminders).
  const enabled = s?.enabled ?? true;
  const offsetsEnabled = (s?.offsets_enabled ??
    ALL_REMINDER_OFFSETS) as ReminderOffsetKey[];

  const rows = (outbox ?? []) as (Pick<
    ReminderOutbox,
    "id" | "offset_key" | "due_on" | "email" | "status" | "sent_at"
  > & { clients: { first_name: string; last_name: string } | null })[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recordatorios</h1>
        <p className="text-muted-foreground">
          Avisos automáticos de vencimiento de membresía por correo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4" />
            Ajustes de la organización
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!canManage && (
            <p className="mb-4 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Sólo un administrador o gerente puede cambiar estos ajustes.
            </p>
          )}
          <ReminderSettingsForm
            enabled={enabled}
            offsetsEnabled={offsetsEnabled}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" />
            Cola de recordatorios (últimos 50)
          </CardTitle>
        </CardHeader>
        <CardContent className={rows.length > 0 ? "p-0" : undefined}>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay recordatorios encolados. Se generan automáticamente cada
              día para las membresías próximas a vencer o recién vencidas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 font-medium">Momento</th>
                    <th className="px-4 py-2 font-medium">Fecha</th>
                    <th className="px-4 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-2">
                        <span className="font-medium">
                          {r.clients
                            ? `${r.clients.first_name} ${r.clients.last_name}`
                            : r.email}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {REMINDER_OFFSET_LABELS[r.offset_key]}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(r.due_on).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            r.status === "sent" && "bg-success/10 text-success",
                            r.status === "pending" &&
                              "bg-amber-500/10 text-amber-600 dark:text-amber-500",
                            r.status === "failed" &&
                              "bg-destructive/10 text-destructive",
                            r.status === "skipped" &&
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {REMINDER_STATUS_LABELS[r.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
