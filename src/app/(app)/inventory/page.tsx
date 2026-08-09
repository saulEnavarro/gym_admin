import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Package, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { stockLevel, STOCK_LEVEL_LABELS } from "@/lib/inventory/helpers";
import type {
  LowStockProduct,
  Product,
  ProductCategory,
  ProductStock,
} from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventoryPage() {
  const { branding } = await requireSession();
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";
  const money = (n: number) => formatCurrency(Number(n), currency, locale);

  const [{ data: products }, { data: categories }, { data: stock }, { data: low }] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("sort_order")
        .order("name"),
      supabase.from("product_categories").select("id, name").order("sort_order"),
      supabase.from("product_stock").select("*"),
      supabase.from("low_stock_products").select("*"),
    ]);

  const rows = (products ?? []) as Product[];
  const cats = new Map(
    ((categories ?? []) as Pick<ProductCategory, "id" | "name">[]).map((c) => [
      c.id,
      c.name,
    ]),
  );

  // Existencias totales por producto (el desglose por sucursal vive en la ficha).
  const totals = new Map<string, { qty: number; min: number | null }>();
  for (const s of (stock ?? []) as ProductStock[]) {
    const prev = totals.get(s.product_id) ?? { qty: 0, min: null };
    totals.set(s.product_id, {
      qty: prev.qty + s.quantity,
      // Se conserva el mínimo más alto: basta con que una sucursal esté baja.
      min:
        s.min_quantity == null
          ? prev.min
          : Math.max(prev.min ?? 0, s.min_quantity),
    });
  }

  const alerts = (low ?? []) as LowStockProduct[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Package className="h-6 w-6 text-primary" />
            Inventario
          </h1>
          <p className="text-muted-foreground">
            Catálogo de productos y existencias por sucursal.
          </p>
        </div>
        <Link href="/inventory/new" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Nuevo producto
        </Link>
      </div>

      {alerts.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="space-y-2 p-5">
            <p className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-4 w-4" />
              {alerts.length}{" "}
              {alerts.length === 1
                ? "producto está en su mínimo"
                : "productos están en su mínimo"}
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {alerts.slice(0, 6).map((a) => (
                <li key={`${a.product_id}-${a.branch_id}`}>
                  <Link
                    href={`/inventory/${a.product_id}`}
                    className="hover:text-foreground"
                  >
                    <strong className="font-medium text-foreground">
                      {a.product_name}
                    </strong>{" "}
                    en {a.branch_name}: quedan {a.quantity} (mínimo{" "}
                    {a.min_quantity})
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay productos en el catálogo.
            </p>
            <Link href="/inventory/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" />
              Crear el primero
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 text-right font-medium">Precio</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Existencias
                    </th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const t = totals.get(p.id);
                    const level = p.track_stock
                      ? stockLevel(t?.qty ?? 0, t?.min ?? null)
                      : null;
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "border-b border-border/60 last:border-0 hover:bg-accent/50",
                          !p.is_active && "opacity-60",
                        )}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/inventory/${p.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {p.name}
                          </Link>
                          {p.sku && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {p.sku}
                            </span>
                          )}
                          {!p.is_active && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.category_id ? cats.get(p.category_id) ?? "—" : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {money(p.price)}
                          <span className="block text-xs text-muted-foreground">
                            sin IVA
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {p.track_stock ? (t?.qty ?? 0) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {level ? (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                level === "ok" && "bg-success/10 text-success",
                                level === "low" &&
                                  "bg-amber-500/10 text-amber-600 dark:text-amber-500",
                                level === "out" &&
                                  "bg-destructive/10 text-destructive",
                              )}
                            >
                              {STOCK_LEVEL_LABELS[level]}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Sin control
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
