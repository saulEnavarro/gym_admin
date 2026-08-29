"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeftRight, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  registerMovement,
  transferStock,
  type StockFormState,
} from "@/app/(app)/inventory/actions";
import { MANUAL_MOVEMENTS } from "@/lib/inventory/helpers";
import { netFromGross, ivaFromGross, round2 } from "@/lib/billing/iva";
import { formatCurrency } from "@/lib/utils";
import type { StockMovementKind } from "@/lib/types/database.types";

const initial: StockFormState = { error: null, ok: null };

/**
 * Reaplica el valor de un `<select>` controlado después de enviar el formulario.
 *
 * React llama a `form.reset()` al terminar la acción, lo que devuelve el select
 * del DOM a su primera opción. Como el estado de React no cambió, React cree que
 * el DOM ya está correcto y no lo vuelve a escribir: el select muestra «Compra»
 * mientras la etiqueta sigue diciendo «Piezas contadas». Ahí un recepcionista
 * registra una entrada creyendo que hace un ajuste.
 */
function useSelectSync(
  ref: React.RefObject<HTMLSelectElement | null>,
  value: string,
  deps: unknown[],
) {
  useEffect(() => {
    if (ref.current && ref.current.value !== value) ref.current.value = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ...deps]);
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: StockFormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return <p className="text-sm text-success">{state.ok}</p>;
  }
  return null;
}

/** Entrada, merma o ajuste por conteo en una sucursal. */
export function MovementForm({
  productId,
  branches,
  currency,
  locale,
}: {
  productId: string;
  branches: { id: string; name: string }[];
  currency: string;
  locale: string;
}) {
  const [state, formAction] = useActionState<StockFormState, FormData>(
    registerMovement,
    initial,
  );
  const [kind, setKind] = useState<StockMovementKind>("purchase");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const kindRef = useRef<HTMLSelectElement>(null);
  const branchRef = useRef<HTMLSelectElement>(null);
  useSelectSync(kindRef, kind, [state]);
  useSelectSync(branchRef, branchId, [state]);
  const config = MANUAL_MOVEMENTS.find((m) => m.value === kind);

  // Cantidad y costo se controlan para poder totalizar la entrada en vivo. Se
  // limpian al terminar la acción, cuando React hace form.reset() (ver arriba).
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  useEffect(() => {
    setQuantity("");
    setUnitCost("");
  }, [state]);

  const pieces = Number(quantity) || 0;
  const costGross = Number(unitCost) || 0;
  const entryGross = round2(costGross * pieces);
  const money = (n: number) => formatCurrency(n, currency, locale);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kind">Movimiento</Label>
          <Select
            ref={kindRef}
            id="kind"
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as StockMovementKind)}
          >
            {MANUAL_MOVEMENTS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          {config && (
            <p className="text-xs text-muted-foreground">{config.hint}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch_id">Sucursal</Label>
          <Select
            ref={branchRef}
            id="branch_id"
            name="branch_id"
            required
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">
            {/* En un ajuste el número NO es un delta: es el conteo. */}
            {kind === "adjustment" ? "Piezas contadas" : "Cantidad"}
          </Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={0}
            step={1}
            required
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        {kind === "purchase" && (
          <div className="space-y-2">
            <Label htmlFor="unit_cost">Costo unitario (IVA incluido)</Label>
            <Input
              id="unit_cost"
              name="unit_cost"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
            {/* Se captura tal cual viene en la factura del proveedor (con IVA);
                abajo se muestra el total de la entrada y el IVA que contiene. */}
            {costGross > 0 && (
              <p className="text-xs text-muted-foreground">
                Incluye {money(ivaFromGross(costGross))} de IVA por pieza (base{" "}
                {money(netFromGross(costGross))})
                {pieces > 0 && (
                  <>
                    {" · "}
                    <strong className="text-foreground">
                      {money(entryGross)}
                    </strong>{" "}
                    de costo total ({pieces} pz, IVA incluido)
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Nota</Label>
          <Input
            id="notes"
            name="notes"
            maxLength={300}
            placeholder={
              kind === "loss" ? "Ej. Envase roto" : "Ej. Factura A-1234"
            }
          />
        </div>
      </div>

      <Feedback state={state} />
      <Submit label="Registrar movimiento" />
    </form>
  );
}

/** Traspaso de piezas entre sucursales. */
export function TransferForm({
  productId,
  branches,
}: {
  productId: string;
  branches: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<StockFormState, FormData>(
    transferStock,
    initial,
  );
  const [from, setFrom] = useState(branches[0]?.id ?? "");
  const [to, setTo] = useState(
    branches.find((b) => b.id !== (branches[0]?.id ?? ""))?.id ?? "",
  );
  const fromRef = useRef<HTMLSelectElement>(null);
  const toRef = useRef<HTMLSelectElement>(null);
  useSelectSync(fromRef, from, [state]);
  useSelectSync(toRef, to, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="from_branch">Desde</Label>
          <Select
            ref={fromRef}
            id="from_branch"
            name="from_branch"
            required
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              // Origen y destino no pueden coincidir: se mueve el destino.
              if (e.target.value === to) {
                setTo(branches.find((b) => b.id !== e.target.value)?.id ?? "");
              }
            }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to_branch">Hacia</Label>
          <Select
            ref={toRef}
            id="to_branch"
            name="to_branch"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
          >
            {branches
              .filter((b) => b.id !== from)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer_quantity">Piezas</Label>
          <Input
            id="transfer_quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            required
            placeholder="0"
          />
        </div>
      </div>

      <Feedback state={state} />
      <Submit label="Traspasar" />
    </form>
  );
}

export const MovementIcon = PackagePlus;
export const TransferIcon = ArrowLeftRight;
