"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
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
import { openCashSession, type CashFormState } from "@/app/(app)/cash/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Abriendo…" : "Abrir turno"}
    </Button>
  );
}

export function OpenSessionForm({
  branches,
  currency,
}: {
  branches: { id: string; name: string }[];
  currency: string;
}) {
  const [state, formAction] = useActionState<CashFormState, FormData>(
    openCashSession,
    { error: null },
  );

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Abrir turno de caja</CardTitle>
        <CardDescription>
          Cuenta el dinero con el que arrancas. Sin turno abierto no se pueden
          registrar ventas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          {branches.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="branch_id">Sucursal</Label>
              <Select id="branch_id" name="branch_id" defaultValue={branches[0]?.id}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            branches[0] && (
              <input type="hidden" name="branch_id" value={branches[0].id} />
            )
          )}

          <div className="space-y-2">
            <Label htmlFor="opening_float">Fondo inicial ({currency}) *</Label>
            <Input
              id="opening_float"
              name="opening_float"
              type="number"
              min={0}
              step={0.01}
              required
              defaultValue="0"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Efectivo con el que abre el cajón (billetes y monedas de cambio).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea id="notes" name="notes" rows={2} maxLength={500} />
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
