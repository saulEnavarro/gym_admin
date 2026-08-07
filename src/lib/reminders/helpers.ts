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

export const ALL_REMINDER_OFFSETS: ReminderOffsetKey[] = [
  "minus_7",
  "minus_3",
  "day_0",
  "plus_7",
  "plus_30",
];

/** Etiqueta en español del estado de un aviso en la cola. */
export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Falló",
  skipped: "Omitido",
};
