"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, HandCoins, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ClientCombobox, type ClientOption } from "@/components/pos/client-combobox";
import {
  closeRental,
  rentProduct,
  type RentalFormState,
} from "@/app/(app)/rentals/actions";

const initial: RentalFormState = { error: null, ok: null };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <HandCoins className="h-4 w-4" />
      {pending ? "Registrando…" : "Prestar"}
    </Button>
  );
}

/** Presta un artículo rentable a un socio. */
export function RentForm({
  products,
  clients,
  branches,
}: {
  products: { id: string; name: string; stock: number }[];
  clients: ClientOption[];
  branches: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<RentalFormState, FormData>(
    rentProduct,
    initial,
  );

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay artículos marcados como rentables. Marca uno desde su ficha en
        Inventario para poder prestarlo.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Socio</Label>
          <ClientCombobox
            clients={clients}
            name="client_id"
            placeholder="Buscar por nombre o número…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_id">Artículo</Label>
          <Select id="product_id" name="product_id" required>
            {products.map((p) => (
              <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                {p.name} · {p.stock > 0 ? `${p.stock} disponibles` : "agotado"}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch_id">Sucursal</Label>
          <Select
            id="branch_id"
            name="branch_id"
            required
            defaultValue={branches[0]?.id}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Piezas</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_hours">Plazo (horas)</Label>
          <Input
            id="due_hours"
            name="due_hours"
            type="number"
            min={1}
            max={720}
            defaultValue={4}
            placeholder="Sin plazo"
          />
          <p className="text-xs text-muted-foreground">
            Pasado el plazo aparece como vencido en las alertas.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Nota</Label>
          <Input id="notes" name="notes" maxLength={300} />
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-success">{state.ok}</p>}

      <Submit />
    </form>
  );
}

/** Cierra un préstamo: devuelto, o dado por perdido. */
export function ReturnButtons({ rentalId }: { rentalId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmLost, setConfirmLost] = useState(false);

  const run = (lost: boolean, notes: string) =>
    start(async () => {
      setError(null);
      const res = await closeRental(rentalId, lost, notes);
      if (res.error) setError(res.error);
      else setConfirmLost(false);
    });

  if (confirmLost) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-muted-foreground">
          Se dará de baja del inventario como merma.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run(true, "No devuelto")}
          >
            Confirmar pérdida
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmLost(false)}
          >
            Volver
          </Button>
        </div>
        {error && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(false, "")}
        >
          <Undo2 className="h-3.5 w-3.5" />
          {pending ? "Registrando…" : "Devuelta"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirmLost(true)}
        >
          No volvió
        </Button>
      </div>
      {error && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </span>
      )}
    </div>
  );
}
