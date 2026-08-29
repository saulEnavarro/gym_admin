"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ScanLine } from "lucide-react";
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
import { BarcodeField } from "@/components/inventory/barcode-field";
import { ivaFromGross, netFromGross, IVA_RATE } from "@/lib/billing/iva";
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
  barcode,
  categories,
  currency,
  locale,
}: {
  product?: Product;
  /** Código leído antes de llegar aquí (alta desde el escaneo). */
  barcode?: string;
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

  // Precio y costo se capturan CON IVA incluido: lo tecleado es el monto final.
  // El IVA y la base se EXTRAEN de ese monto, no se suman encima.
  const priceGross = Number(price) || 0;
  const priceNet = netFromGross(priceGross);
  const priceTax = ivaFromGross(priceGross);
  const costGross = Number(cost) || 0;
  const costNet = netFromGross(costGross);
  const costTax = ivaFromGross(costGross);
  const util = margin(costGross, priceGross);
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4 text-primary" />
            Código de barras
          </CardTitle>
          <CardDescription>
            Con el lector conectado, el alta de un producto se hace sin soltar la
            pistola: dispara sobre el empaque y el código queda capturado. Es el
            mismo lector del check-in, y el mismo código con el que después se
            cobra y se cuenta el inventario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarcodeField defaultValue={product?.barcode ?? barcode ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Precios</CardTitle>
          <CardDescription>
            Captura el costo y el precio <strong>con IVA incluido</strong>: lo
            que escribes es lo que se paga. Abajo se desglosa el IVA que ya va
            contenido, para tu control contable.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cost">Costo (IVA incluido)</Label>
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
              Lo que te cuesta a ti, tal cual viene en la factura. Alimenta el
              reporte de utilidad.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio de venta (IVA incluido) *</Label>
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
            <div className="flex justify-between font-medium">
              <span>Costo (IVA incluido)</span>
              <span>{money(costGross)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                IVA contenido ({Math.round(IVA_RATE * 100)}%) · base{" "}
                {money(costNet)}
              </span>
              <span>{money(costTax)}</span>
            </div>

            <div className="my-2 border-t border-border" />

            <div className="flex justify-between font-semibold">
              <span>Precio al público (IVA incluido)</span>
              <span>{money(priceGross)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                IVA contenido ({Math.round(IVA_RATE * 100)}%) · base{" "}
                {money(priceNet)}
              </span>
              <span>{money(priceTax)}</span>
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
              name="is_rentable"
              defaultChecked={product?.is_rentable ?? false}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              Se puede prestar
              <span className="block text-xs text-muted-foreground">
                Toallas y candados: se entregan al socio y se registran en
                Préstamos hasta que vuelven. Puede además venderse.
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
