/**
 * Etiquetas y utilidades para la bitácora de auditoría (`audit_logs`).
 *
 * La tabla guarda `entity` = nombre técnico de la tabla y `action` = operación
 * (INSERT/UPDATE/DELETE o una acción de negocio). Aquí se traducen a algo que un
 * administrador entienda sin conocer el esquema.
 */

/** Nombre legible de cada tabla auditada. */
export const ENTITY_LABELS: Record<string, string> = {
  organizations: "Organización",
  branches: "Sucursal",
  org_branding: "Personalización",
  org_members: "Equipo",
  profiles: "Perfil",
  clients: "Cliente",
  membership_plans: "Membresía (plan)",
  client_memberships: "Membresía otorgada",
  sales: "Venta",
  sale_items: "Línea de venta",
  cash_sessions: "Turno de caja",
  cash_movements: "Movimiento de caja",
  products: "Producto",
  product_categories: "Categoría de producto",
  product_stock: "Existencias",
  stock_movements: "Movimiento de inventario",
  rentals: "Préstamo",
  org_reminder_settings: "Ajustes de recordatorios",
};

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

export type AuditActionKind = "create" | "update" | "delete" | "other";

/** Agrupa la acción cruda en una de cuatro clases, para color e ícono. */
export function actionKind(action: string): AuditActionKind {
  switch (action.toUpperCase()) {
    case "INSERT":
      return "create";
    case "UPDATE":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return "other";
  }
}

export const ACTION_LABELS: Record<AuditActionKind, string> = {
  create: "Creó",
  update: "Modificó",
  delete: "Eliminó",
  other: "Acción",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[actionKind(action)];
}

/** Entidades ofrecidas como filtro (las que un admin querría revisar). */
export const AUDIT_FILTER_ENTITIES = [
  "clients",
  "sales",
  "membership_plans",
  "products",
  "stock_movements",
  "cash_sessions",
  "org_members",
  "org_branding",
  "branches",
] as const;

/**
 * Intenta describir en una línea qué fila se tocó, buscando un campo con nombre
 * dentro del snapshot. La bitácora guarda `new_data`/`old_data` como JSON, y casi
 * todas las tablas tienen alguno de estos campos.
 */
export function describeRow(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;
  const first = data["first_name"];
  const last = data["last_name"];
  if (typeof first === "string" || typeof last === "string") {
    return [first, last].filter(Boolean).join(" ").trim() || null;
  }
  for (const key of ["name", "display_name", "plan_name", "description", "folio"]) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return `#${v}`;
  }
  return null;
}
