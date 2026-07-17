/**
 * IVA (México). Decisión §7: los precios capturados son BASE gravable, SIN IVA.
 * El 16% se calcula y se suma APARTE en el ticket, el total y los reportes.
 */
export const IVA_RATE = 0.16;

/** Monto de IVA sobre una base sin IVA. */
export function ivaAmount(base: number, rate = IVA_RATE): number {
  return round2(base * rate);
}

/** Total con IVA a partir de una base sin IVA. */
export function withIva(base: number, rate = IVA_RATE): number {
  return round2(base + ivaAmount(base, rate));
}

/** Redondeo a 2 decimales (centavos), evitando errores de coma flotante. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
