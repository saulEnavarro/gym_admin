import type { ClientSex } from "@/lib/types/database.types";

/** Etiquetas en español para el sexo del cliente. */
export const SEX_LABELS: Record<ClientSex, string> = {
  female: "Femenino",
  male: "Masculino",
  other: "Otro",
  undisclosed: "Prefiere no decir",
};

export function sexLabel(sex: ClientSex | null | undefined): string {
  return sex ? SEX_LABELS[sex] : "—";
}

/** Formatea el número de cliente como #0001 (mínimo 4 dígitos). */
export function formatMemberNumber(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}

/** Nombre completo "Nombre Apellidos". */
export function fullName(c: {
  first_name: string;
  last_name: string;
}): string {
  return `${c.first_name} ${c.last_name}`.trim();
}

/** Edad en años a partir de la fecha de nacimiento (ISO yyyy-mm-dd). */
export function ageFromBirthDate(
  birthDate: string | null | undefined,
): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

/** ¿La persona es menor de edad (según la fecha de nacimiento)? */
export function isMinor(birthDate: string | null | undefined): boolean {
  const age = ageFromBirthDate(birthDate);
  return age !== null && age < 18;
}

/** Iniciales para el avatar cuando no hay foto. */
export function initials(c: {
  first_name: string;
  last_name: string;
}): string {
  const a = c.first_name?.[0] ?? "";
  const b = c.last_name?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}
