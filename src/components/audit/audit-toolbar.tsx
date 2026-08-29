"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { AUDIT_FILTER_ENTITIES, entityLabel } from "@/lib/audit/helpers";

/** Filtros de la bitácora por tipo de entidad y acción, sincronizados a la URL. */
export function AuditToolbar({
  entity,
  action,
}: {
  entity: string;
  action: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function change(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    // Cualquier filtro nuevo reinicia la paginación.
    params.delete("page");
    const query = params.toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname),
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
        <span className="shrink-0">Sección</span>
        <Select
          value={entity}
          onChange={(e) => change("entity", e.target.value)}
          className="flex-1"
        >
          <option value="all">Todas</option>
          {AUDIT_FILTER_ENTITIES.map((ent) => (
            <option key={ent} value={ent}>
              {entityLabel(ent)}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
        <span className="shrink-0">Acción</span>
        <Select
          value={action}
          onChange={(e) => change("action", e.target.value)}
          className="flex-1"
        >
          <option value="all">Todas</option>
          <option value="insert">Creaciones</option>
          <option value="update">Modificaciones</option>
          <option value="delete">Eliminaciones</option>
        </Select>
      </label>
    </div>
  );
}
