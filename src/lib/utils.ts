import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Une clases de Tailwind resolviendo conflictos (patrón shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convierte un color HEX (#RRGGBB) al formato HSL que esperan las variables CSS
 * de tema: `"262 83% 58%"`. Permite inyectar el color de marca de cada
 * organización en runtime sin recompilar Tailwind.
 */
export function hexToHslString(hex: string): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "262 83% 58%";

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Formatea un importe en la moneda/idioma de la organización. */
export function formatCurrency(
  amount: number,
  currency = "MXN",
  locale = "es-MX",
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount,
  );
}
