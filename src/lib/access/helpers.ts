/**
 * Veredicto de la puerta, ya listo para pintar (incluye la foto firmada).
 *
 * Vive aquí y no junto a la server action a propósito: un archivo `"use server"`
 * sólo puede exportar funciones async, así que exportar `EMPTY_RESULT` desde
 * ahí revienta en tiempo de ejecución («a "use server" file can only export
 * async functions»). El build no lo detecta; sólo se ve al abrir la página.
 */
export type AccessResult = {
  status:
    | "granted"
    | "authorized"
    | "already_inside"
    | "checked_out"
    | "not_inside"
    | "denied"
    | null;
  reason: string | null;
  days: number | null;
  minutes: number | null;
  client: {
    id: string;
    member_number: number;
    first_name: string;
    last_name: string;
  } | null;
  membership: { plan_name: string; end_date: string } | null;
  photoUrl: string | null;
  /** Fallo técnico (no un veredicto de la puerta). */
  error: string | null;
};

export const EMPTY_RESULT: AccessResult = {
  status: null,
  reason: null,
  days: null,
  minutes: null,
  client: null,
  membership: null,
  photoUrl: null,
  error: null,
};

/** Cómo se le explica al recepcionista un veredicto de la puerta. */
export const ACCESS_DENIAL_LABELS: Record<string, string> = {
  invalid_token: "Código no reconocido",
  expired_token: "El QR caducó: pide al socio que lo actualice en su portal",
  client_not_found: "Socio no encontrado",
  inactive_client: "Socio dado de baja",
  no_membership: "Sin membresía registrada",
  expired_membership: "Membresía vencida",
};

export function denialLabel(reason: string | null): string {
  if (!reason) return "Acceso denegado";
  return ACCESS_DENIAL_LABELS[reason] ?? "Acceso denegado";
}

/**
 * Sólo estos motivos admiten que recepción autorice el paso. Un QR no
 * reconocido o un socio dado de baja no se «autorizan»: se resuelven de otra
 * forma (alta manual, reactivar la ficha).
 */
export function isOverridable(reason: string | null): boolean {
  return reason === "expired_membership" || reason === "no_membership";
}

/** "1 h 13 min" a partir de minutos. */
export function formatStay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/** Días restantes en palabras, para la pantalla de la puerta. */
export function daysLabel(days: number | null): string | null {
  if (days == null) return null;
  if (days > 1) return `Le quedan ${days} días`;
  if (days === 1) return "Le queda 1 día";
  if (days === 0) return "Vence hoy";
  if (days === -1) return "Venció ayer";
  return `Venció hace ${Math.abs(days)} días`;
}
