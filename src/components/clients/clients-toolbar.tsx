"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** Búsqueda por nombre/número/correo + filtro de estado, sincronizados a la URL. */
export function ClientsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const status = searchParams.get("status") ?? "all";

  // Debounce de la búsqueda para no navegar en cada tecla.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      startTransition(() => router.replace(`${pathname}?${params.toString()}`));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function onStatusChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("status", value);
    else params.delete("status");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, número o correo…"
          className="pl-9"
        />
      </div>
      <Select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="sm:w-48"
      >
        <option value="all">Todos</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </Select>
    </div>
  );
}
