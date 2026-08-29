"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ivaFromGross, netFromGross } from "@/lib/billing/iva";
import { formatCurrency } from "@/lib/utils";
import type { MembershipPlan } from "@/lib/types/database.types";

type ActionState = { error: string | null };
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

export function PlanForm({
  action,
  plan,
  currency,
  locale,
  cancelHref,
  submitLabel,
}: {
  action: Action;
  plan?: MembershipPlan | null;
  currency: string;
  locale: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {
    error: null,
  });
  const [price, setPrice] = useState<string>(
    plan ? String(plan.price) : "",
  );
  const priceNum = Number(price);
  const validPrice = price !== "" && !Number.isNaN(priceNum) && priceNum >= 0;

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
          <CardTitle className="text-base">Datos de la membresía</CardTitle>
          <CardDescription>
            El precio es <strong>con IVA incluido</strong>: lo que escribes es lo
            que se le cobra al socio en el punto de venta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              defaultValue={plan?.name ?? ""}
              placeholder="Mensual, Semanal, Visita…"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              maxLength={500}
              defaultValue={plan?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio con IVA incluido ({currency}) *</Label>
            <Input
              id="price"
              name="price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {validPrice
                ? `Es lo que se cobra. Incluye ${formatCurrency(
                    ivaFromGross(priceNum),
                    currency,
                    locale,
                  )} de IVA (base ${formatCurrency(
                    netFromGross(priceNum),
                    currency,
                    locale,
                  )}).`
                : "Es lo que se cobra al socio, IVA incluido."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration_days">Vigencia (días) *</Label>
            <Input
              id="duration_days"
              name="duration_days"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={plan?.duration_days ?? 30}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_members">Personas cubiertas</Label>
            <Input
              id="max_members"
              name="max_members"
              type="number"
              min={1}
              max={10}
              step={1}
              defaultValue={plan?.max_members ?? 1}
            />
            <p className="text-xs text-muted-foreground">
              Usa 2 para membresías de pareja (venta vinculada).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Orden de despliegue</Label>
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              min={0}
              step={1}
              defaultValue={plan?.sort_order ?? 0}
            />
          </div>

          <div className="flex items-center sm:col-span-2">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={plan?.is_active ?? true}
                className="h-4 w-4 rounded border-input"
              />
              Disponible para venta
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Link
          href={cancelHref}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
