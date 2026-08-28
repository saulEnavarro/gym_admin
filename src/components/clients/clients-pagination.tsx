"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select } from "@/components/ui/select";
import { CLIENT_PAGE_SIZES } from "@/lib/clients/helpers";

/**
 * Paginación del listado de clientes, sincronizada a la URL (?page= y ?per=).
 * Vive en la URL para que una página concreta se pueda compartir o recargar.
 */
export function ClientsPagination({
  page,
  pageSize,
  total,
  shown,
}: {
  /** Página actual, base 1. */
  page: number;
  pageSize: number;
  /** Total de clientes que cumplen el filtro, no sólo los de esta página. */
  total: number;
  /** Filas realmente pintadas en esta página. */
  shown: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + shown;

  function navigate(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname),
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? (
          "Sin resultados"
        ) : (
          <>
            Mostrando <strong className="text-foreground">{from}</strong>–
            <strong className="text-foreground">{to}</strong> de{" "}
            <strong className="text-foreground">{total}</strong>{" "}
            {total === 1 ? "cliente" : "clientes"}
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Por página
          <Select
            value={String(pageSize)}
            // Cambiar el tamaño manda a la página 1: la 7ª de 50 en 50 no es la
            // 7ª de 200 en 200, y saltar a otro tramo desorienta.
            onChange={(e) => navigate({ per: e.target.value, page: null })}
            className="h-9 w-24"
            aria-label="Clientes por página"
          >
            {CLIENT_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex items-center gap-1">
          <PageButton
            label="Página anterior"
            disabled={page <= 1}
            onClick={() =>
              navigate({ page: page - 1 <= 1 ? null : String(page - 1) })
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </PageButton>
          <span className="px-2 text-sm tabular-nums text-muted-foreground">
            {page} / {lastPage}
          </span>
          <PageButton
            label="Página siguiente"
            disabled={page >= lastPage}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            <ChevronRight className="h-4 w-4" />
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
