"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Barcode, Plus, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export type ScanIndexItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
};

/**
 * Búsqueda por lector para el control de inventarios: se dispara sobre el
 * producto en el anaquel y se abre su ficha, que es donde se ajustan las
 * existencias. Evita el recorrido «buscar en la lista → reconocer el nombre →
 * clic», que con un catálogo largo es lo que hace lento un conteo.
 *
 * El índice viaja completo desde el servidor (id, nombre, SKU y código) para
 * resolver la coincidencia sin una ida y vuelta por cada disparo.
 */
export function BarcodeScanSearch({ products }: { products: ScanIndexItem[] }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [notFound, setNotFound] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function resolve(raw: string): ScanIndexItem | null {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    // El código y el SKU son identificadores: se exige coincidencia exacta para
    // no abrir la ficha equivocada. El nombre sí admite coincidencia parcial,
    // pero sólo si es la única, para que teclear a mano siga sirviendo.
    const exact = products.find(
      (p) => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q,
    );
    if (exact) return exact;
    const byName = products.filter((p) => p.name.toLowerCase().includes(q));
    return byName.length === 1 ? byName[0]! : null;
  }

  function submit() {
    const match = resolve(term);
    if (match) {
      setNotFound(null);
      router.push(`/inventory/${match.id}`);
      return;
    }
    setNotFound(term.trim() || null);
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                setNotFound(null);
              }}
              onKeyDown={(e) => {
                // El lector termina siempre con Enter; aquí es lo que dispara
                // la búsqueda en vez de enviar nada.
                if (e.key !== "Enter") return;
                e.preventDefault();
                submit();
              }}
              placeholder="Escanea un producto o teclea su código, SKU o nombre…"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
          >
            <ScanLine className="h-4 w-4" />
            Buscar
          </button>
        </div>

        {notFound ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Ningún producto tiene el código{" "}
              <span className="font-mono text-foreground">{notFound}</span>.
            </span>
            <Link
              href={`/inventory/new?barcode=${encodeURIComponent(notFound)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Plus className="h-4 w-4" />
              Darlo de alta con ese código
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Dispara el lector con el cursor aquí: se abre la ficha del producto
            para ajustar existencias, registrar una entrada o una merma.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
