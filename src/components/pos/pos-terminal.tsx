"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Banknote, CreditCard, ArrowLeftRight } from "lucide-react";
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
import { ivaAmount, round2, IVA_RATE } from "@/lib/billing/iva";
import { formatCurrency, cn } from "@/lib/utils";
import { durationLabel } from "@/lib/memberships/helpers";

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
  currency,
  locale,
}: {
  clients: ClientOption[];
  plans: PlanOption[];
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

  const plan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId],
  );
  const isCouple = plan?.max_members === 2;

  // Totales en vivo (misma fórmula que la BD: base sin IVA → descuento → IVA).
  const totals = useMemo(() => {
    if (!plan) return null;
    const subtotal = round2(plan.price * plan.max_members);
    const raw = Number(discountValue) || 0;
    let discount = 0;
    if (discountType === "percent") {
      discount = round2((subtotal * Math.min(Math.max(raw, 0), 100)) / 100);
    } else if (discountType === "amount") {
      discount = Math.min(Math.max(raw, 0), subtotal);
    }
    const base = round2(subtotal - discount);
    const tax = ivaAmount(base);
    const total = round2(base + tax);
    return { subtotal, discount, base, tax, total };
  }, [plan, discountType, discountValue]);

  const money = (n: number) => formatCurrency(n, currency, locale);
  const canSubmit = !!clientId && !!planId;

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
              <Label htmlFor="plan_id">Plan *</Label>
              <Select
                id="plan_id"
                name="plan_id"
                required
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                <option value="">Selecciona una membresía…</option>
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
            {!plan ? (
              <p className="text-muted-foreground">
                Selecciona una membresía para ver el total.
              </p>
            ) : (
              <>
                <Row label={`${plan.name}${isCouple ? " (2 personas)" : ""}`}>
                  {money(totals!.subtotal)}
                </Row>
                {totals!.discount > 0 && (
                  <Row label="Descuento" muted>
                    −{money(totals!.discount)}
                  </Row>
                )}
                <Row label="Subtotal (base)">{money(totals!.base)}</Row>
                <Row label={`IVA (${Math.round(IVA_RATE * 100)}%)`}>
                  {money(totals!.tax)}
                </Row>
                <div className="border-t border-border pt-3">
                  <Row label="Total" strong>
                    {money(totals!.total)}
                  </Row>
                </div>
              </>
            )}
            <div className="pt-2">
              <SubmitButton disabled={!canSubmit} />
            </div>
            {!canSubmit && (
              <p className="text-center text-xs text-muted-foreground">
                Elige cliente y membresía para continuar.
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
