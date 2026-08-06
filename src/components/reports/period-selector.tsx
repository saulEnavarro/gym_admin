"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PeriodKind } from "@/lib/reports/period";

const TABS: { value: PeriodKind; label: string }[] = [
  { value: "day", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "custom", label: "Rango" },
];

/**
 * El periodo vive en la URL (`?period=…&from=…&to=…&branch=…`), no en estado
 * local: así el corte es enlazable, sobrevive a un refresh y el export puede
 * reusar exactamente los mismos parámetros.
 */
export function PeriodSelector({
  period,
  from,
  to,
  branchId,
  branches,
}: {
  period: PeriodKind;
  from: string;
  to: string;
  branchId: string | null;
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  function go(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`/reports?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="inline-flex rounded-md border border-border p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() =>
              go(
                t.value === "custom"
                  ? { period: t.value, from: customFrom, to: customTo }
                  : { period: t.value, from: null, to: null },
              )
            }
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition-colors",
              period === t.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">
              Desde
            </Label>
            <Input
              id="from"
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">
              Hasta
            </Label>
            <Input
              id="to"
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            variant="outline"
            onClick={() =>
              go({ period: "custom", from: customFrom, to: customTo })
            }
          >
            <CalendarRange className="h-4 w-4" />
            Aplicar
          </Button>
        </div>
      )}

      {branches.length > 1 && (
        <div className="space-y-1">
          <Label htmlFor="branch" className="text-xs">
            Sucursal
          </Label>
          <Select
            id="branch"
            value={branchId ?? ""}
            onChange={(e) => go({ branch: e.target.value || null })}
            className="w-56"
          >
            <option value="">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
