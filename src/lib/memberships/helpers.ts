/** Etiqueta legible de la vigencia de un plan (en días). */
export function durationLabel(days: number): string {
  if (days === 1) return "1 día";
  if (days === 7) return "1 semana";
  if (days === 15) return "15 días";
  if (days === 30) return "1 mes";
  if (days === 365) return "1 año";
  if (days % 30 === 0) return `${days / 30} meses`;
  if (days % 7 === 0) return `${days / 7} semanas`;
  return `${days} días`;
}

/** Etiqueta del alcance de personas de un plan. */
export function membersLabel(maxMembers: number): string {
  return maxMembers > 1 ? `${maxMembers} personas` : "Individual";
}
