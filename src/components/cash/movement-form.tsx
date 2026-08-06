"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  registerCashMovement,
  type CashFormState,
} from "@/app/(app)/cash/actions";
import { MANUAL_CATEGORIES } from "@/lib/cash/helpers";
import type { CashMovementCategory } from "@/lib/types/database.types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando…" : "Registrar movimiento"}
    </Button>
  );
}

export function MovementForm({ currency }: { currency: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CashMovementCategory>("supplier");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<CashFormState, FormData>(
    registerCashMovement,
    { error: null },
  );

  // Tras un registro correcto, limpiar para poder capturar el siguiente.
  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  // El tipo (ingreso/egreso) lo determina la categoría: no se capturan aparte.
  const kind =
    MANUAL_CATEGORIES.find((c) => c.value === category)?.kind ?? "expense";

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Registrar movimiento
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      // w-full: al expandirse ocupa su propia línea dentro del encabezado flex.
      className="w-full space-y-4 rounded-md border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="kind" value={kind} />

      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="category">Concepto</Label>
          <Select
            id="category"
            name="category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as CashMovementCategory)
            }
          >
            <optgroup label="Ingresos">
              {MANUAL_CATEGORIES.filter((c) => c.kind === "income").map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Egresos">
              {MANUAL_CATEGORIES.filter((c) => c.kind === "expense").map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Monto ({currency})</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0.01}
            step={0.01}
            required
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_method">Forma</Label>
          <Select id="payment_method" name="payment_method" defaultValue="cash">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Input
            id="description"
            name="description"
            maxLength={300}
            placeholder="Ej. Garrafones de agua"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Sólo los movimientos en <strong>efectivo</strong> afectan el arqueo del
        cajón.
      </p>

      <div className="flex flex-wrap gap-2">
        <SubmitButton />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>
    </form>
  );
}
