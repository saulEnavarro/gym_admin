"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Banknote, CreditCard, ArrowLeftRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientCombobox, type ClientOption } from "./client-combobox";
import { createSale, type SaleFormState } from "@/app/(app)/pos/actions";
import { ivaFromGross, netFromGross, round2, IVA_RATE } from "@/lib/billing/iva";
import { formatCurrency, cn } from "@/lib/utils";
import { durationLabel } from "@/lib/memberships/helpers";

export type ProductOption = {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  barcode: string | null;
  /** Existencias en la sucursal del turno. null = no lleva control. */
  stock: number | null;
};

export type CartLine = { product: ProductOption; quantity: number };

export type PlanOption = {
  id: string;
  name: string;
  price: number;
  max_members: number;
  duration_days: number;
};

type PaymentMethod = "cash" | "card" | "transfer";

const PAYMENTS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] =
  [
    { value: "cash", label: "Efectivo", icon: Banknote },
    { value: "card", label: "Tarjeta", icon: CreditCard },
    { value: "transfer", label: "Transferencia", icon: ArrowLeftRight },
  ];

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending || disabled} className="w-full">
      {pending ? "Procesando…" : "Cobrar y registrar venta"}
    </Button>
  );
}

export function PosTerminal({
  clients,
  plans,
  products,
  currency,
  locale,
}: {
  clients: ClientOption[];
  plans: PlanOption[];
  products: ProductOption[];
  currency: string;
  locale: string;
}) {
  const [state, formAction] = useActionState<SaleFormState, FormData>(
    createSale,
    { error: null },
  );

  const [clientId, setClientId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string>("");
  const [discountType, setDiscountType] = useState<"none" | "amount" | "percent">(
    "none",
  );
  const [discountValue, setDiscountValue] = useState<string>("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");

  /** Agrega una pieza, o suma una más si el producto ya está en el ticket. */
  function addProduct(prod: ProductOption) {
    setCart((prev) => {
      const found = prev.find((l) => l.product.id === prod.id);
      if (!found) return [...prev, { product: prod, quantity: 1 }];
      // No se deja pasar del stock: la base lo rechazaría al cobrar y sería
      // peor enterarse hasta entonces.
      if (prod.stock != null && found.quantity >= prod.stock) return prev;
      return prev.map((l) =>
        l.product.id === prod.id ? { ...l, quantity: l.quantity + 1 } : l,
      );
    });
    setSearch("");
  }

  function setQuantity(id: string, qty: number) {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.product.id !== id)
        : prev.map((l) => (l.product.id === id ? { ...l, quantity: qty } : l)),
    );
  }

  // Búsqueda por nombre, SKU o código de barras: el lector del mostrador
  // teclea el código y con Enter se agrega directo.
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, search]);

  const plan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId],
  );
  const isCouple = plan?.max_members === 2;

  // Totales en vivo (misma fórmula que la BD: precio con IVA − descuento = total;
  // el IVA se extrae del total, no se suma encima).
  const cartTotal = useMemo(
    () => round2(cart.reduce((s, l) => s + l.product.price * l.quantity, 0)),
    [cart],
  );

  const totals = useMemo(() => {
    const planSubtotal = plan ? round2(plan.price * plan.max_members) : 0;
    const subtotal = round2(planSubtotal + cartTotal);
    if (subtotal === 0 && !plan) return null;
    const raw = Number(discountValue) || 0;
    let discount = 0;
    if (discountType === "percent") {
      discount = round2((subtotal * Math.min(Math.max(raw, 0), 100)) / 100);
    } else if (discountType === "amount") {
      discount = Math.min(Math.max(raw, 0), subtotal);
    }
    // Precios CON IVA incluido: el total es lo que se cobra (precio − descuento)
    // y el IVA se extrae de ese total, no se suma encima.
    const total = round2(subtotal - discount);
    const base = netFromGross(total);
    const tax = ivaFromGross(total);
    return { subtotal, discount, base, tax, total };
  }, [plan, cartTotal, discountType, discountValue]);

  const money = (n: number) => formatCurrency(n, currency, locale);
  // Se puede cobrar con membresía, con productos, o con ambos. La membresía
  // exige socio; un ticket de sólo productos es para público general.
  const canSubmit = (!!planId && !!clientId) || cart.length > 0;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      {/* Columna izquierda: captura */}
      <div className="space-y-6 lg:col-span-2">
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
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ClientCombobox
              clients={clients}
              name="client_id"
              placeholder="Buscar por nombre o número…"
              onSelect={setClientId}
            />
            {isCouple && (
              <div className="space-y-2">
                <Label>Segundo cliente (pareja)</Label>
                <ClientCombobox
                  clients={clients}
                  name="partner_client_id"
                  placeholder="Buscar al acompañante…"
                  excludeId={clientId}
                />
                <p className="text-xs text-muted-foreground">
                  Esta membresía es de pareja: se otorgará a ambos con el mismo
                  vencimiento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membresía</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plan_id">Plan</Label>
              <Select
                id="plan_id"
                name="plan_id"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                <option value="">Sin membresía (sólo productos)</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price)}
                    {p.max_members > 1 ? " x persona" : ""} ·{" "}
                    {durationLabel(p.duration_days)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_type">Descuento</Label>
              <Select
                id="discount_type"
                name="discount_type"
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as typeof discountType)
                }
              >
                <option value="none">Sin descuento</option>
                <option value="percent">Porcentaje (%)</option>
                <option value="amount">Monto ({currency})</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {discountType === "percent" ? "Porcentaje" : "Monto"}
              </Label>
              <Input
                id="discount_value"
                name="discount_value"
                type="number"
                min={0}
                step={discountType === "percent" ? 1 : 0.01}
                disabled={discountType === "none"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* El carrito viaja en un campo oculto: la base recibe la lista y
                recalcula todo, aquí sólo se muestra el avance. */}
            <input
              type="hidden"
              name="items"
              value={JSON.stringify(
                cart.map((l) => ({
                  product_id: l.product.id,
                  quantity: l.quantity,
                })),
              )}
            />

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  // El lector del mostrador teclea el código y manda Enter: se
                  // agrega la coincidencia sin tocar el mouse.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const first = matches[0];
                    if (first) addProduct(first);
                  }
                }}
                placeholder="Buscar producto, SKU o escanear código…"
                className="pl-9"
                autoComplete="off"
              />
            </div>

            {matches.length > 0 && (
              <ul className="max-h-56 space-y-1 overflow-auto rounded-md border border-border p-1">
                {matches.map((prod) => {
                  const agotado = prod.stock != null && prod.stock <= 0;
                  return (
                    <li key={prod.id}>
                      <button
                        type="button"
                        disabled={agotado}
                        onClick={() => addProduct(prod)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm",
                          agotado
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        <span className="min-w-0 truncate">
                          {prod.name}
                          {prod.sku && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {prod.sku}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {money(prod.price)}
                          {prod.stock != null && (
                            <span className="ml-2 text-xs">
                              {agotado ? "agotado" : `${prod.stock} pz`}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {cart.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Sin productos en el ticket.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {cart.map((l) => (
                  <li
                    key={l.product.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{l.product.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={l.product.stock ?? undefined}
                        value={l.quantity}
                        onChange={(e) =>
                          setQuantity(l.product.id, Number(e.target.value))
                        }
                        className="h-8 w-16 text-center"
                        aria-label={`Cantidad de ${l.product.name}`}
                      />
                      <span className="w-20 text-right font-medium">
                        {money(round2(l.product.price * l.quantity))}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(l.product.id, 0)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Quitar ${l.product.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="hidden" name="payment_method" value={payment} />
            <div className="grid grid-cols-3 gap-3">
              {PAYMENTS.map((p) => {
                const Icon = p.icon;
                const active = payment === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPayment(p.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border p-3 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea id="notes" name="notes" rows={2} maxLength={500} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Columna derecha: resumen */}
      <div className="lg:col-span-1">
        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!totals ? (
              <p className="text-muted-foreground">
                Agrega una membresía o algún producto.
              </p>
            ) : (
              <>
                {plan && (
                  <Row label={`${plan.name}${isCouple ? " (2 personas)" : ""}`}>
                    {money(round2(plan.price * plan.max_members))}
                  </Row>
                )}
                {cart.map((l) => (
                  <Row
                    key={l.product.id}
                    label={`${l.product.name}${l.quantity > 1 ? ` × ${l.quantity}` : ""}`}
                  >
                    {money(round2(l.product.price * l.quantity))}
                  </Row>
                ))}

                {totals!.discount > 0 && (
                  <Row label="Descuento" muted>
                    −{money(totals!.discount)}
                  </Row>
                )}
                <div className="border-t border-border pt-3">
                  <Row label="Total a cobrar" strong>
                    {money(totals!.total)}
                  </Row>
                </div>
                <Row label={`IVA incluido (${Math.round(IVA_RATE * 100)}%)`} muted>
                  {money(totals!.tax)}
                </Row>
                <Row label="Base sin IVA" muted>
                  {money(totals!.base)}
                </Row>
              </>
            )}
            <div className="pt-2">
              <SubmitButton disabled={!canSubmit} />
            </div>
            {!canSubmit && (
              <p className="text-center text-xs text-muted-foreground">
                Agrega productos, o elige cliente y membresía.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function Row({
  label,
  children,
  strong,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        strong && "text-base font-semibold",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span className={strong ? "" : "font-medium"}>{children}</span>
    </div>
  );
}
