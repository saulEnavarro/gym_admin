"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMemberNumber } from "@/lib/clients/helpers";

export type ClientOption = {
  id: string;
  member_number: number;
  first_name: string;
  last_name: string;
};

/**
 * Selector de cliente con búsqueda local. Guarda el id elegido en un input
 * oculto (`name`). `excludeId` oculta a un cliente (p. ej. el titular al elegir
 * la pareja) para no venderle una membresía de pareja a sí mismo.
 */
export function ClientCombobox({
  clients,
  name,
  placeholder = "Buscar cliente…",
  excludeId,
  onSelect,
}: {
  clients: ClientOption[];
  name: string;
  placeholder?: string;
  excludeId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ClientOption | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => c.id !== excludeId)
      .filter((c) => {
        if (!q) return true;
        const full = `${c.first_name} ${c.last_name}`.toLowerCase();
        return (
          full.includes(q) ||
          String(c.member_number).includes(q) ||
          formatMemberNumber(c.member_number).includes(q)
        );
      })
      .slice(0, 30);
  }, [clients, query, excludeId]);

  function choose(c: ClientOption) {
    setSelected(c);
    setOpen(false);
    setQuery("");
    onSelect?.(c.id);
  }

  function clear() {
    setSelected(null);
    onSelect?.(null);
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <input type="hidden" name={name} value={selected.id} />
        <span>
          <span className="font-mono text-muted-foreground">
            {formatMemberNumber(selected.member_number)}
          </span>{" "}
          {selected.first_name} {selected.last_name}
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Quitar selección"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          className="pr-9"
          autoComplete="off"
        />
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Sin coincidencias.
            </li>
          ) : (
            results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    choose(c);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Check className="h-3.5 w-3.5 opacity-0" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatMemberNumber(c.member_number)}
                  </span>
                  <span>
                    {c.first_name} {c.last_name}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
