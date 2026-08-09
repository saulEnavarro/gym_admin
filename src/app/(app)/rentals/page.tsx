import type { Metadata } from "next";
import { AlertTriangle, HandCoins, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RentForm, ReturnButtons } from "@/components/rentals/rental-forms";
import { formatMemberNumber } from "@/lib/clients/helpers";
import { formatStay } from "@/lib/access/helpers";
import { cn } from "@/lib/utils";
import type { PendingRental, Rental } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Préstamos" };

export const dynamic = "force-dynamic";

export default async function RentalsPage() {
  const { branding } = await requireSession();
  const supabase = await createClient();
  const locale = branding?.locale ?? "es-MX";

  const { data: allowed } = await supabase.rpc("current_user_branch_ids");
  const ids = allowed ?? [];

  const [
    { data: branches },
    { data: clients },
    { data: rentables },
    { data: stock },
    { data: pending },
    { data: history },
  ] = await Promise.all([
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
      .from("products")
      .select("id, name")
      .eq("is_rentable", true)
      .eq("is_active", true)
      .order("name"),
    supabase.from("product_stock").select("product_id, branch_id, quantity"),
    supabase
      .from("pending_rentals")
      .select("*")
      .order("rented_at", { ascending: true }),
    supabase
      .from("rentals")
      .select("*")
      .neq("status", "pending")
      .order("returned_at", { ascending: false })
      .limit(30),
  ]);

  const branchList = (branches ?? []) as { id: string; name: string }[];

  // Disponibles del artículo en las sucursales que el usuario opera.
  const stockByProduct = new Map<string, number>();
  for (const s of stock ?? []) {
    if (!ids.includes(s.branch_id)) continue;
    stockByProduct.set(
      s.product_id,
      (stockByProduct.get(s.product_id) ?? 0) + s.quantity,
    );
  }
  const products = (rentables ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    stock: stockByProduct.get(p.id) ?? 0,
  }));

  const open = (pending ?? []) as PendingRental[];
  const overdue = open.filter((r) => r.overdue);
  const closed = (history ?? []) as Rental[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <HandCoins className="h-6 w-6 text-primary" />
          Préstamos
        </h1>
        <p className="text-muted-foreground">
          Toallas y artículos prestados a socios, con su devolución.
        </p>
      </div>

      {overdue.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              {overdue.length}{" "}
              {overdue.length === 1
                ? "préstamo pasó de su plazo"
                : "préstamos pasaron de su plazo"}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prestar un artículo</CardTitle>
          <CardDescription>
            El artículo sale del inventario pero sigue siendo del gimnasio: esto
            no cobra nada. Si cobras la renta, véndela como producto en el POS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RentForm
            products={products}
            clients={clients ?? []}
            branches={branchList}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span>Pendientes de devolución</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
              {open.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {open.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No hay nada prestado en este momento.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {open.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 px-6 py-4",
                    r.overdue && "bg-amber-500/5",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {r.product_name}
                      {(r.quantity ?? 1) > 1 ? ` × ${r.quantity}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono text-xs">
                        {formatMemberNumber(r.member_number ?? 0)}
                      </span>{" "}
                      {r.first_name} {r.last_name} · {r.branch_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Desde{" "}
                      {new Date(r.rented_at!).toLocaleString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      · {formatStay(r.minutes_out ?? 0)} fuera
                      {r.overdue && (
                        <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-500">
                          Vencido
                        </span>
                      )}
                    </p>
                  </div>
                  <ReturnButtons rentalId={r.id!} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {closed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Cerrados recientemente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {closed.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {r.returned_at
                      ? new Date(r.returned_at).toLocaleString(locale, {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      r.status === "returned"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {r.status === "returned" ? "Devuelto" : "No devuelto"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

