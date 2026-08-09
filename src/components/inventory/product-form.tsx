"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createProduct,
  updateProduct,
  type ProductFormState,
} from "@/app/(app)/inventory/actions";
import { ivaAmount, round2, IVA_RATE } from "@/lib/billing/iva";
import { margin } from "@/lib/inventory/helpers";
import { formatCurrency } from "@/lib/utils";
import type { Product, ProductCategory } from "@/lib/types/database.types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

export function ProductForm({
  product,
  categories,
  currency,
  locale,
}: {
  product?: Product;
  categories: Pick<ProductCategory, "id" | "name">[];
  currency: string;
  locale: string;
}) {
  const action = product
    ? updateProduct.bind(null, product.id)
    : createProduct;
  const [state, formAction] = useActionState<ProductFormState, FormData>(
    action,
    { error: null },
  );

  const [cost, setCost] = useState(String(product?.cost ?? ""));
  const [price, setPrice] = useState(String(product?.price ?? ""));

  const base = Number(price) || 0;
  const tax = ivaAmount(base);
  const total = round2(base + tax);
  const util = margin(Number(cost) || 0, base);
  const money = (n: number) => formatCurrency(n, currency, locale);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Producto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={160}
              defaultValue={product?.name ?? ""}
              placeholder="Ej. Proteína de suero 2 kg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Categoría</Label>
            <Select
              id="category_id"
              name="category_id"
              defaultValue={product?.category_id ?? ""}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Orden</Label>
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              min={0}
              defaultValue={product?.sort_order ?? 0}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              maxLength={600}
              defaultValue={product?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              name="sku"
              maxLength={60}
              defaultValue={product?.sku ?? ""}
              placeholder="PRO-2K"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Código de barras</Label>
            <Input
              id="barcode"
              name="barcode"
              maxLength={80}
              defaultValue={product?.barcode ?? ""}
              placeholder="7501000000000"
            />
            <p className="text-xs text-muted-foreground">
              Se lee con el mismo lector del check-in.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Precios</CardTitle>
          <CardDescription>
            Captura el costo y el precio <strong>sin IVA</strong>, igual que en
            las membresías. El IVA se suma aparte en el ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cost">Costo (sin IVA)</Label>
            <Input
              id="cost"
              name="cost"
              type="number"
              min={0}
              step={0.01}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Lo que te cuesta a ti. Alimenta el reporte de utilidad.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio de venta (sin IVA) *</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              step={0.01}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm sm:col-span-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio sin IVA</span>
              <span>{money(base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                IVA ({Math.round(IVA_RATE * 100)}%)
              </span>
              <span>{money(tax)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
              <span>Precio al público</span>
              <span>{money(total)}</span>
            </div>
            {util != null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Margen: <strong>{util}%</strong> sobre el precio de venta.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disponibilidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="track_stock"
              defaultChecked={product?.track_stock ?? true}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              Llevar control de existencias
              <span className="block text-xs text-muted-foreground">
                Desactívalo para servicios o productos a granel que no se cuentan
                por pieza.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              Disponible para venta
              <span className="block text-xs text-muted-foreground">
                Si lo apagas deja de aparecer en el punto de venta, pero su
                historial se conserva.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <SubmitButton label={product ? "Guardar cambios" : "Crear producto"} />
        <Link
          href={product ? `/inventory/${product.id}` : "/inventory"}
          className={buttonVariants({ variant: "ghost" })}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
