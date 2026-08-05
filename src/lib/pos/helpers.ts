import type {
  PaymentMethod,
  ClientMembership,
} from "@/lib/types/database.types";

/** Etiquetas en español de los métodos de pago. */
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

export function paymentLabel(m: PaymentMethod): string {
  return PAYMENT_LABELS[m] ?? m;
}

/** Folio de venta formateado: V-0001. */
export function formatFolio(n: number): string {
  return `V-${String(n).padStart(4, "0")}`;
}

/** Diferencia en días de calendario (b - a), ignorando la hora. */
function dayDiff(a: Date, b: Date): number {
  const ms = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  return Math.round(ms / 86_400_000);
}

export type MembershipStatus = "active" | "expired" | "cancelled";

/**
 * Estado efectivo de una membresía: 'cancelled' si se canceló; si no, 'expired'
 * cuando ya venció (end_date < hoy) y 'active' en caso contrario. El 'vencido'
 * se deriva de la fecha, no se almacena.
 */
export function membershipStatus(
  m: Pick<ClientMembership, "status" | "end_date">,
  today = new Date(),
): MembershipStatus {
  if (m.status === "cancelled") return "cancelled";
  const end = new Date(m.end_date);
  return dayDiff(today, end) < 0 ? "expired" : "active";
}

/** Días restantes (hoy incluido). 0 o negativo si ya venció. */
export function daysRemaining(endDate: string, today = new Date()): number {
  return dayDiff(today, new Date(endDate)) + 1;
}

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
};
