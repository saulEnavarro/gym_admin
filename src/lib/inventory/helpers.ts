import type { StockMovementKind } from "@/lib/types/database.types";

export const MOVEMENT_LABELS: Record<StockMovementKind, string> = {
  purchase: "Compra",
  sale: "Venta",
  sale_return: "Devolución de venta",
  adjustment: "Ajuste por conteo",
  loss: "Merma",
  transfer_in: "Traspaso recibido",
  transfer_out: "Traspaso enviado",
};

/**
 * Movimientos que se capturan a mano desde la pantalla de inventario.
 * `sale` y `sale_return` quedan fuera a propósito: los genera el POS, y
 * dejarlos aquí permitiría descuadrar el inventario contra las ventas.
 */
export const MANUAL_MOVEMENTS: {
  value: StockMovementKind;
  label: string;
  sign: "in" | "out" | "set";
  hint: string;
}[] = [
  {
    value: "purchase",
    label: "Compra / entrada",
    sign: "in",
    hint: "Mercancía que llega del proveedor.",
  },
  {
    value: "loss",
    label: "Merma",
    sign: "out",
    hint: "Caducidad, rotura o faltante.",
  },
  {
    value: "adjustment",
    label: "Ajuste por conteo",
    sign: "set",
    hint: "Deja las existencias en lo que contaste físicamente.",
  },
];

export function movementLabel(kind: StockMovementKind): string {
  return MOVEMENT_LABELS[kind] ?? kind;
}

/** Suma, resta o fija: define cómo se pinta el movimiento en la bitácora. */
export function movementSign(kind: StockMovementKind): 1 | -1 | 0 {
  if (kind === "purchase" || kind === "sale_return" || kind === "transfer_in") {
    return 1;
  }
  if (kind === "sale" || kind === "loss" || kind === "transfer_out") return -1;
  return 0;
}

/** Margen de utilidad sobre el precio de venta. Null si no hay precio. */
export function margin(cost: number, price: number): number | null {
  if (!price) return null;
  return Math.round(((price - cost) / price) * 1000) / 10;
}

export type StockLevel = "out" | "low" | "ok";

export function stockLevel(
  quantity: number,
  minQuantity: number | null,
): StockLevel {
  if (quantity <= 0) return "out";
  if (minQuantity != null && quantity <= minQuantity) return "low";
  return "ok";
}

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  out: "Agotado",
  low: "Bajo mínimo",
  ok: "Disponible",
};
