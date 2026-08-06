/**
 * Normaliza un valor de `FormData` antes de validarlo con Zod.
 *
 * `formData.get()` devuelve dos cosas distintas para "sin dato":
 *   · `null` cuando el campo no viajó — no se renderizó (p. ej. el segundo
 *     cliente de una membresía de pareja en una venta individual) o estaba
 *     `disabled` (el navegador no envía los campos deshabilitados).
 *   · `""`   cuando el campo viajó vacío.
 *
 * Zod rechaza ambos contra `z.string().optional()` («Expected string, received
 * null»), así que aquí se colapsan a `undefined`.
 */
export const emptyToUndefined = (v: unknown) =>
  v === null || (typeof v === "string" && v.trim() === "") ? undefined : v;
