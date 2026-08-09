export const WEEKDAY_LABELS = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

/** isodow (1 = lunes … 7 = domingo) → etiqueta corta. */
export function weekdayLabel(isodow: number): string {
  return WEEKDAY_LABELS[isodow - 1] ?? "";
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export type HourPoint = { hour: number; avg_inside: number };

/**
 * Hora más llena y hora más vacía **entre las que tienen actividad**.
 *
 * Las horas de madrugada están vacías porque el gimnasio está cerrado, no
 * porque sean un buen momento para ir: recomendar «las 4 de la mañana» sería
 * absurdo. Por eso el valle se busca sólo dentro del horario con movimiento.
 */
export function peakAndQuiet(points: HourPoint[]): {
  peak: HourPoint | null;
  quiet: HourPoint | null;
} {
  const active = points.filter((p) => Number(p.avg_inside) > 0);
  if (active.length === 0) return { peak: null, quiet: null };

  const sorted = [...active].sort(
    (a, b) => Number(a.avg_inside) - Number(b.avg_inside),
  );
  return {
    peak: sorted[sorted.length - 1] ?? null,
    quiet: sorted[0] ?? null,
  };
}

/**
 * Las horas más tranquilas de un día concreto, para recomendárselas al socio.
 * Se limita al horario con actividad por la misma razón que arriba.
 */
export function quietHoursFor(
  rows: { weekday: number; hour: number; avg_inside: number }[],
  weekday: number,
  take = 3,
): { hour: number; avg_inside: number }[] {
  return rows
    .filter((r) => r.weekday === weekday && Number(r.avg_inside) > 0)
    .sort((a, b) => Number(a.avg_inside) - Number(b.avg_inside))
    .slice(0, take)
    .sort((a, b) => a.hour - b.hour)
    .map((r) => ({ hour: r.hour, avg_inside: Number(r.avg_inside) }));
}

/** Qué tan lleno está, en palabras, para el socio. */
export function crowdLabel(
  inside: number,
  capacity: number | null,
): { label: string; tone: "low" | "mid" | "high" } {
  if (!capacity) {
    // Sin aforo declarado no se puede hablar de porcentaje sin inventarlo.
    return inside === 0
      ? { label: "Vacío ahora", tone: "low" }
      : { label: `${inside} ${inside === 1 ? "persona" : "personas"} dentro`, tone: "mid" };
  }
  const pct = (inside / capacity) * 100;
  if (pct < 40) return { label: "Tranquilo", tone: "low" };
  if (pct < 75) return { label: "Movido", tone: "mid" };
  return { label: "Lleno", tone: "high" };
}
