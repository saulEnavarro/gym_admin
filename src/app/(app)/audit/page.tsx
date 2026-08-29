import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ScrollText,
  Plus,
  Pencil,
  Trash2,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { AuditToolbar } from "@/components/audit/audit-toolbar";
import {
  actionKind,
  actionLabel,
  describeRow,
  entityLabel,
} from "@/lib/audit/helpers";
import { cn } from "@/lib/utils";
import type { AuditLog, Profile } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Auditoría" };

const PAGE_SIZE = 50;

type SearchParams = Promise<{ entity?: string; action?: string; page?: string }>;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { membership, branding } = await requireSession();
  // La RLS ya restringe la lectura a administradores; si un no-admin llega
  // aquí por la URL, la consulta vuelve vacía. Cortamos antes para ser claros.
  if (!membership) notFound();
  if (membership.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              La bitácora de auditoría sólo está disponible para
              administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { entity = "all", action = "all", page: pageParam } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const locale = branding?.locale ?? "es-MX";
  const timeZone = branding?.timezone ?? "America/Mexico_City";
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select(
      "id, entity, action, entity_id, actor_id, old_data, new_data, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (entity !== "all") query = query.eq("entity", entity);
  if (action !== "all") query = query.eq("action", action.toUpperCase());

  const { data, count } = await query;
  const rows = (data ?? []) as Pick<
    AuditLog,
    | "id"
    | "entity"
    | "action"
    | "entity_id"
    | "actor_id"
    | "old_data"
    | "new_data"
    | "created_at"
  >[];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Nombres de los actores en una sola consulta (RLS deja ver a los compañeros
  // de la org). Los eventos sin actor son cambios del sistema o por SQL directo.
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))];
  const actorNames = new Map<string, string>();
  if (actorIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds as string[]);
    for (const p of (profiles ?? []) as Pick<Profile, "id" | "full_name">[]) {
      if (p.full_name) actorNames.set(p.id, p.full_name);
    }
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ScrollText className="h-6 w-6 text-primary" />
          Auditoría
        </h1>
        <p className="text-muted-foreground">
          Bitácora de cambios sensibles: quién hizo qué y cuándo. Es de sólo
          lectura y no se puede alterar.
        </p>
      </div>

      <AuditToolbar entity={entity} action={action} />

      {total > 0 && (
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString(locale)}{" "}
          {total === 1 ? "evento registrado" : "eventos registrados"}
          {lastPage > 1 && ` · página ${page} de ${lastPage}`}
        </p>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No hay eventos con esos filtros.
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
                    <th className="px-4 py-3 font-medium">Acción</th>
                    <th className="px-4 py-3 font-medium">Qué</th>
                    <th className="px-4 py-3 font-medium">Quién</th>
                    <th className="px-4 py-3 font-medium">Cuándo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const kind = actionKind(r.action);
                    const detail =
                      describeRow(r.new_data as Record<string, unknown>) ??
                      describeRow(r.old_data as Record<string, unknown>);
                    const actor = r.actor_id
                      ? actorNames.get(r.actor_id) ?? "Usuario del sistema"
                      : "Sistema";
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-border/60 last:border-0 hover:bg-accent/50"
                      >
                        <td className="px-4 py-3">
                          <ActionBadge kind={kind} label={actionLabel(r.action)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {entityLabel(r.entity)}
                          </div>
                          {detail && (
                            <div className="text-xs text-muted-foreground">
                              {detail}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {actor}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {dateFmt.format(new Date(r.created_at))}
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

      {lastPage > 1 && (
        <div className="flex items-center justify-between">
          <PagerLink
            entity={entity}
            action={action}
            page={page - 1}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anteriores
          </PagerLink>
          <span className="text-sm tabular-nums text-muted-foreground">
            {page} / {lastPage}
          </span>
          <PagerLink
            entity={entity}
            action={action}
            page={page + 1}
            disabled={page >= lastPage}
          >
            Siguientes
            <ChevronRight className="h-4 w-4" />
          </PagerLink>
        </div>
      )}
    </div>
  );
}

function PagerLink({
  entity,
  action,
  page,
  disabled,
  children,
}: {
  entity: string;
  action: string;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const params = new URLSearchParams();
  if (entity !== "all") params.set("entity", entity);
  if (action !== "all") params.set("action", action);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();

  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground/40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={query ? `/audit?${query}` : "/audit"}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
    >
      {children}
    </Link>
  );
}

function ActionBadge({
  kind,
  label,
}: {
  kind: ReturnType<typeof actionKind>;
  label: string;
}) {
  const Icon =
    kind === "create"
      ? Plus
      : kind === "update"
        ? Pencil
        : kind === "delete"
          ? Trash2
          : Activity;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        kind === "create" && "bg-success/10 text-success",
        kind === "update" && "bg-primary/10 text-primary",
        kind === "delete" && "bg-destructive/10 text-destructive",
        kind === "other" && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
