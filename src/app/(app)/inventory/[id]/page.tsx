import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  History,
  PackagePlus,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MovementForm, TransferForm } from "@/components/inventory/stock-forms";
import { ivaAmount, round2, withIva, IVA_RATE } from "@/lib/billing/iva";
import {
  margin,
  movementLabel,
  movementSign,
  stockLevel,
  STOCK_LEVEL_LABELS,
} from "@/lib/inventory/helpers";
import { formatCurrency, cn } from "@/lib/utils";
import type {
  Product,
  ProductStock,
  StockMovement,
} from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Producto" };

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { branding } = await requireSession();
  const { id } = await params;
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";
  const money = (n: number) => formatCurrency(Number(n), currency, locale);

  const { data: raw } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!raw) notFound();
  const p = raw as Product;

  const [{ data: branches }, { data: stock }, { data: movements }, { data: category }] =
    await Promise.all([
      supabase
        .from("branches")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabase.from("product_stock").select("*").eq("product_id", id),
      supabase
        .from("stock_movements")
        .select("*")
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      p.category_id
        ? supabase
            .from("product_categories")
            .select("name")
            .eq("id", p.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const branchList = (branches ?? []) as { id: string; name: string }[];
  const stockRows = (stock ?? []) as ProductStock[];
  const byBranch = new Map(stockRows.map((s) => [s.branch_id, s]));
  const total = stockRows.reduce((sum, s) => sum + s.quantity, 0);
  const logs = (movements ?? []) as StockMovement[];

  const base = Number(p.price);
  const tax = ivaAmount(base);
  const util = margin(Number(p.cost), base);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Inventario
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
          <p className="text-muted-foreground">
            {(category as { name: string } | null)?.name ?? "Sin categoría"}
            {p.sku ? ` · SKU ${p.sku}` : ""}
            {p.barcode ? ` · ${p.barcode}` : ""}
          </p>
        </div>
        <Link
          href={`/inventory/${p.id}/edit`}
          className={buttonVariants({ variant: "outline" })}
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Link>
      </div>

      {/* Precios */}
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-4">
          <Tile
            label="Costo"
            value={money(p.cost)}
            hint={`sin IVA · ${money(withIva(Number(p.cost)))} con IVA`}
          />
          <Tile label="Precio" value={money(base)} hint="sin IVA" />
          <Tile
            label="Al público"
            value={money(round2(base + tax))}
            hint={`IVA ${Math.round(IVA_RATE * 100)}% incluido`}
            strong
          />
          <Tile
            label="Margen"
            value={util != null ? `${util}%` : "—"}
            hint="sobre el precio de venta"
          />
        </CardContent>
      </Card>

      {/* Existencias por sucursal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existencias por sucursal</CardTitle>
          <CardDescription>
            El catálogo es de la organización, pero el producto está en un
            anaquel concreto: una sucursal sólo puede vender lo que tiene.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {!p.track_stock ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">
              Este producto no lleva control de existencias.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-2 font-medium">Sucursal</th>
                    <th className="px-5 py-2 text-right font-medium">Piezas</th>
                    <th className="px-5 py-2 text-right font-medium">Mínimo</th>
                    <th className="px-5 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {branchList.map((b) => {
                    const s = byBranch.get(b.id);
                    const qty = s?.quantity ?? 0;
                    const level = stockLevel(qty, s?.min_quantity ?? null);
                    return (
                      <tr
                        key={b.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-5 py-2">{b.name}</td>
                        <td className="px-5 py-2 text-right font-medium">
                          {qty}
                        </td>
                        <td className="px-5 py-2 text-right text-muted-foreground">
                          {s?.min_quantity ?? "—"}
                        </td>
                        <td className="px-5 py-2">
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
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/40">
                    <td className="px-5 py-2 font-medium">Total</td>
                    <td className="px-5 py-2 text-right font-semibold">
                      {total}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {p.track_stock && branchList.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackagePlus className="h-4 w-4" />
                Registrar movimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MovementForm
                productId={p.id}
                branches={branchList}
                currency={currency}
                locale={locale}
              />
            </CardContent>
          </Card>

          {branchList.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowLeftRight className="h-4 w-4" />
                  Traspaso entre sucursales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransferForm productId={p.id} branches={branchList} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Bitácora */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Movimientos
          </CardTitle>
          <CardDescription>
            El libro que explica cómo las existencias llegaron a su saldo actual.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">
              Sin movimientos registrados.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((m) => {
                const sign = movementSign(m.kind);
                return (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{movementLabel(m.kind)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleString(locale)}
                        {m.notes ? ` · ${m.notes}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-medium",
                        sign > 0 && "text-success",
                        sign < 0 && "text-destructive",
                        sign === 0 && "text-muted-foreground",
                      )}
                    >
                      {sign > 0 ? "+" : sign < 0 ? "−" : "±"}
                      {m.quantity}
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

function Tile({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold", strong && "text-primary")}>
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
