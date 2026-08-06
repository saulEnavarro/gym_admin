import type {
  CashMovementCategory,
  CashMovementKind,
} from "@/lib/types/database.types";

export const MOVEMENT_KIND_LABELS: Record<CashMovementKind, string> = {
  income: "Ingreso",
  expense: "Egreso",
};

export const MOVEMENT_CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  sale_refund: "Reembolso de venta",
  supplier: "Pago a proveedor",
  payroll: "Pago a personal",
  withdrawal: "Retiro de efectivo",
  deposit: "Aportación a caja",
  adjustment: "Ajuste",
  other: "Otro",
};

/**
 * Categorías capturables a mano. `sale_refund` queda fuera a propósito: lo
 * genera `cancel_sale` al cancelar una venta, no la recepción.
 */
export const MANUAL_CATEGORIES: {
  value: CashMovementCategory;
  label: string;
  kind: CashMovementKind;
}[] = [
  { value: "deposit", label: "Aportación a caja", kind: "income" },
  { value: "other", label: "Otro ingreso", kind: "income" },
  { value: "supplier", label: "Pago a proveedor", kind: "expense" },
  { value: "payroll", label: "Pago a personal", kind: "expense" },
  { value: "withdrawal", label: "Retiro de efectivo", kind: "expense" },
  { value: "adjustment", label: "Ajuste", kind: "expense" },
];

export function movementCategoryLabel(c: CashMovementCategory): string {
  return MOVEMENT_CATEGORY_LABELS[c] ?? c;
}

/** Duración de un turno en formato "3 h 20 min". */
export function sessionDuration(openedAt: string, closedAt?: string | null): string {
  const end = closedAt ? new Date(closedAt) : new Date();
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - new Date(openedAt).getTime()) / 60_000),
  );
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/**
 * Lectura del arqueo: cuadra, faltante o sobrante. Se compara con tolerancia de
 * un centavo para no reportar diferencias por redondeo.
 */
export function arqueoVerdict(difference: number): {
  label: string;
  tone: "ok" | "short" | "over";
} {
  if (Math.abs(difference) < 0.01) return { label: "Cuadra", tone: "ok" };
  return difference < 0
    ? { label: "Faltante", tone: "short" }
    : { label: "Sobrante", tone: "over" };
}
