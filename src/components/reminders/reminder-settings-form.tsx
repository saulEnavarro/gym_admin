"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  updateReminderSettings,
  type ReminderSettingsState,
} from "@/app/(app)/settings/reminders/actions";
import { Button } from "@/components/ui/button";
import type { ReminderOffsetKey } from "@/lib/types/database.types";

const OFFSETS: { key: ReminderOffsetKey; label: string; hint: string }[] = [
  { key: "minus_7", label: "7 días antes", hint: "Aviso anticipado" },
  { key: "minus_3", label: "3 días antes", hint: "Recordatorio cercano" },
  { key: "day_0", label: "El día de vencimiento", hint: "Último aviso" },
  { key: "plus_7", label: "7 días después", hint: "Reactivación" },
  { key: "plus_30", label: "30 días después", hint: "Recuperación" },
];

const initialState: ReminderSettingsState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Guardando…" : "Guardar ajustes"}
    </Button>
  );
}

export function ReminderSettingsForm({
  enabled,
  offsetsEnabled,
  canManage,
}: {
  enabled: boolean;
  offsetsEnabled: ReminderOffsetKey[];
  canManage: boolean;
}) {
  const [state, formAction] = useActionState(
    updateReminderSettings,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={enabled}
          disabled={!canManage}
          className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
        />
        <span className="text-sm font-medium">
          Enviar recordatorios de vencimiento por correo
        </span>
      </label>

      <fieldset className="space-y-3" disabled={!canManage}>
        <legend className="mb-1 text-sm text-muted-foreground">
          Momentos de envío
        </legend>
        {OFFSETS.map((o) => (
          <label
            key={o.key}
            className="flex items-center gap-3 rounded-md border border-border p-3"
          >
            <input
              type="checkbox"
              name="offset"
              value={o.key}
              defaultChecked={offsetsEnabled.includes(o.key)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
            />
            <span className="flex-1">
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-muted-foreground">
                {o.hint}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {state.error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Ajustes guardados.
        </div>
      )}

      {canManage && <SubmitButton />}
    </form>
  );
}
