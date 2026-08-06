/**
 * Rangos de fecha para los cortes.
 *
 * Un corte «del día» es un concepto LOCAL del gimnasio, no del servidor: en
 * Vercel el proceso corre en UTC, así que a las 22:00 de Ciudad de México el
 * `new Date()` del servidor ya es el día siguiente y el corte diario saldría
 * vacío. Por eso todo se calcula en la zona horaria de la organización
 * (`org_branding.timezone`) y se pasa a Postgres como fechas `YYYY-MM-DD`;
 * la conversión a instantes UTC la hacen las funciones de agregación.
 */

export type PeriodKind = "day" | "week" | "month" | "custom";

export type Period = {
  kind: PeriodKind;
  /** Inclusivo, YYYY-MM-DD en la zona de la organización. */
  from: string;
  /** Inclusivo. */
  to: string;
  label: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy (YYYY-MM-DD) en una zona horaria dada. */
export function todayInTz(timeZone: string): string {
  // "en-CA" formatea como YYYY-MM-DD, que es justo lo que espera Postgres.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Aritmética de días sobre una fecha civil, sin que el horario de verano estorbe. */
function civil(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = civil(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** Día de la semana con la semana empezando en LUNES (0 = lunes). */
function mondayIndex(date: string): number {
  return (civil(date).getUTCDay() + 6) % 7;
}

/**
 * Resuelve el periodo a partir de los parámetros de la URL. Ante cualquier
 * valor inválido cae a «hoy» en vez de reventar: es una pantalla de lectura y
 * los parámetros vienen de la barra de direcciones.
 */
export function resolvePeriod(
  params: { period?: string; from?: string; to?: string },
  timeZone: string,
): Period {
  const today = todayInTz(timeZone);
  const kind = (params.period ?? "day") as PeriodKind;

  if (kind === "custom") {
    const from = ISO.test(params.from ?? "") ? params.from! : today;
    const to = ISO.test(params.to ?? "") ? params.to! : today;
    // Rango al revés: se endereza en vez de devolver cero resultados.
    const [a, b] = from <= to ? [from, to] : [to, from];
    return { kind, from: a, to: b, label: "Periodo personalizado" };
  }

  if (kind === "week") {
    const from = addDays(today, -mondayIndex(today));
    return { kind, from, to: addDays(from, 6), label: "Esta semana" };
  }

  if (kind === "month") {
    const from = `${today.slice(0, 7)}-01`;
    const next = civil(from);
    next.setUTCMonth(next.getUTCMonth() + 1);
    return { kind, from, to: addDays(iso(next), -1), label: "Este mes" };
  }

  return { kind: "day", from: today, to: today, label: "Hoy" };
}

/** Texto del rango para encabezados y nombres de archivo. */
export function formatPeriodRange(p: Period, locale = "es-MX"): string {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return p.from === p.to ? fmt(p.from) : `${fmt(p.from)} — ${fmt(p.to)}`;
}
