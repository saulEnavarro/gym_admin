/**
 * IVA (México). Los precios y costos se capturan CON IVA INCLUIDO: la cantidad
 * que se digita es el monto final: lo que el cliente paga y lo que se cobra en
 * caja. El 16% NO se suma encima; se considera ya contenido y, cuando hace
 * falta desglosarlo (base gravable e IVA para efectos contables), se EXTRAE del
 * total con `netFromGross` / `ivaFromGross`.
 */
export const IVA_RATE = 0.16;

/** Redondeo a 2 decimales (centavos), evitando errores de coma flotante. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Base gravable (sin IVA) contenida en un monto que YA incluye IVA. */
export function netFromGross(gross: number, rate = IVA_RATE): number {
  return round2(gross / (1 + rate));
}

/** IVA contenido dentro de un monto que YA lo incluye. */
export function ivaFromGross(gross: number, rate = IVA_RATE): number {
  return round2(gross - netFromGross(gross, rate));
}
