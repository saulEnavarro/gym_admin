"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Search, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fullName, formatMemberNumber } from "@/lib/clients/helpers";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types/database.types";

type PickerClient = Pick<
  Client,
  "id" | "first_name" | "last_name" | "member_number" | "user_id"
>;

/**
 * Selector del socio a previsualizar. Busca por nombre o número y sincroniza la
 * elección a la URL (?client=), para que una vista previa concreta se pueda
 * recargar o compartir. Marca con un check a quienes ya tienen portal activo.
 */
export function PortalPreviewPicker({
  clients,
  selectedId,
}: {
  clients: PickerClient[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? clients.filter(
          (c) =>
            fullName(c).toLowerCase().includes(term) ||
            String(c.member_number).includes(term),
        )
      : clients;
    return base.slice(0, 12);
  }, [clients, q]);

  function pick(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("client", id);
    startTransition(() =>
      router.replace(`${pathname}?${params.toString()}`),
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar socio por nombre o número…"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {matches.map((c) => {
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-accent",
              )}
            >
              {c.user_id && (
                <UserCheck className="h-3.5 w-3.5 text-success" />
              )}
              <span className="truncate">{fullName(c)}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatMemberNumber(c.member_number)}
              </span>
            </button>
          );
        })}
        {matches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ningún socio coincide con la búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}
