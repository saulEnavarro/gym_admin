import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Tags, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TogglePlanActive } from "@/components/memberships/toggle-plan-active";
import { DeletePlanButton } from "@/components/memberships/delete-plan-button";
import { formatCurrency } from "@/lib/utils";
import { netFromGross } from "@/lib/billing/iva";
import { durationLabel, membersLabel } from "@/lib/memberships/helpers";
import type { MembershipPlan } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Membresías" };

export default async function MembershipsPage() {
  const { branding } = await requireSession();
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";

  const { data: plans } = await supabase
    .from("membership_plans")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const rows = (plans ?? []) as MembershipPlan[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Membresías</h1>
          <p className="text-muted-foreground">
            Catálogo de planes. Los precios son con IVA incluido: lo que ves es
            lo que se cobra.
          </p>
        </div>
        <Link href="/memberships/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Nueva membresía
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Tags className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aún no hay membresías. Crea la primera.
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
                    <th className="px-4 py-3 font-medium">Membresía</th>
                    <th className="px-4 py-3 font-medium">Vigencia</th>
                    <th className="px-4 py-3 font-medium">Personas</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Precio (IVA incl.)
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Base s/IVA
                    </th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/60 last:border-0 hover:bg-accent/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        {p.description && (
                          <div className="text-xs text-muted-foreground">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {durationLabel(p.duration_days)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {membersLabel(p.max_members)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(p.price, currency, locale)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatCurrency(netFromGross(p.price), currency, locale)}
                      </td>
                      <td className="px-4 py-3">
                        {p.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-4">
                          <Link
                            href={`/memberships/${p.id}/edit`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Link>
                          <TogglePlanActive id={p.id} active={p.is_active} />
                          <DeletePlanButton id={p.id} name={p.name} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
