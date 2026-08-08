import type {
  ReminderOffsetKey,
  ReminderStatus,
} from "@/lib/types/database.types";

/** Etiqueta en español de cada momento de recordatorio. */
export const REMINDER_OFFSET_LABELS: Record<ReminderOffsetKey, string> = {
  minus_7: "7 días antes",
  minus_3: "3 días antes",
  day_0: "Día de vencimiento",
  plus_7: "7 días después",
  plus_30: "30 días después",
};

/** Todos los momentos que existen, en orden cronológico (para la UI). */
export const ALL_REMINDER_OFFSETS: ReminderOffsetKey[] = [
  "minus_7",
  "minus_3",
  "day_0",
  "plus_7",
  "plus_30",
];

/**
 * Momentos activos cuando la organización no ha tocado la configuración: un
 * solo aviso, siete días antes. Debe coincidir con el default de
 * `org_reminder_settings.offsets_enabled` (migración 0019); si no, la UI
 * mostraría casillas que no reflejan lo que hace el encolado.
 */
export const DEFAULT_REMINDER_OFFSETS: ReminderOffsetKey[] = ["minus_7"];

/**
 * Etiqueta en español del estado de un aviso en la cola.
 *
 * Desde la migración 0018 un fallo de envío NO deja la fila en `failed`: se
 * reprograma y sigue `pending`. `failed` significa que se agotaron los
 * intentos, de ahí «Descartado» — es un buzón para revisar a mano, no un
 * tropiezo pasajero.
 */
export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Descartado",
  skipped: "Omitido",
};

/** Resume los reintentos de una fila para la tabla de la cola. */
export function retryLabel(
  attempts: number,
  nextAttemptAt: string | null,
  status: ReminderStatus,
  locale = "es-MX",
): string {
  if (attempts === 0) return "—";
  if (status !== "pending") return `${attempts}`;
  const when = nextAttemptAt ? new Date(nextAttemptAt) : null;
  if (!when || when.getTime() <= Date.now()) return `${attempts} · en cola`;
  return `${attempts} · reintenta ${when.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
