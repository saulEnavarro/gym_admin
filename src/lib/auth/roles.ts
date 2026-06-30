import type { AppRole } from "@/lib/types/database.types";

/** Etiquetas en español de los roles (§3 de la especificación). */
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  manager: "Gerente",
  receptionist: "Recepcionista",
  instructor: "Instructor",
  client: "Cliente",
};

/** Roles considerados "staff" (acceso al panel administrativo). */
export const STAFF_ROLES: AppRole[] = [
  "admin",
  "manager",
  "receptionist",
  "instructor",
];

export function roleLabel(role: AppRole): string {
  return ROLE_LABELS[role] ?? role;
}
