"use client";

import { useRef, useState } from "react";
import { Barcode, Check, ScanLine, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Captura del código de barras con lector físico.
 *
 * Un lector USB se comporta como un teclado: teclea el código muy rápido y
 * termina con Enter. Dentro de un formulario ese Enter lo ENVÍA, así que dar de
 * alta un producto escaneando guardaba la ficha a medias. Aquí el Enter se
 * atrapa: confirma el código y deja el foco puesto para el siguiente producto.
 *
 * El ritmo de las teclas distingue al lector de una persona (un humano no
 * teclea 12 dígitos en 50 ms), y sólo sirve para dar acuse en pantalla: el
 * campo se puede escribir a mano igual que antes.
 */
export function BarcodeField({
  defaultValue = "",
  name = "barcode",
}: {
  defaultValue?: string;
  name?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [scanned, setScanned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastKeyAt = useRef(0);
  const burst = useRef(0);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // El Enter del lector NO debe enviar el formulario.
      e.preventDefault();
      if (value.trim()) setScanned(true);
      burst.current = 0;
      return;
    }
    if (e.key.length !== 1) return;
    const now = Date.now();
    burst.current = now - lastKeyAt.current < 50 ? burst.current + 1 : 0;
    lastKeyAt.current = now;
  }

  const byScanner = scanned && burst.current >= 4;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={name}>Código de barras</Label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              id={name}
              name={name}
              maxLength={80}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setScanned(false);
              }}
              onKeyDown={onKeyDown}
              placeholder="Dispara el lector o teclea el código…"
              className={cn(
                "pl-9 font-mono",
                scanned && "border-success ring-1 ring-success",
              )}
              autoComplete="off"
              inputMode="numeric"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setValue("");
              setScanned(false);
              inputRef.current?.focus();
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
          >
            <ScanLine className="h-4 w-4" />
            Escanear
          </button>

          {value && (
            <button
              type="button"
              aria-label="Borrar el código"
              onClick={() => {
                setValue("");
                setScanned(false);
                inputRef.current?.focus();
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {scanned ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <Check className="h-4 w-4 shrink-0" />
          Código capturado{byScanner ? " con el lector" : ""}:{" "}
          <span className="font-mono">{value}</span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Pon el cursor en el campo y dispara el lector: el código entra solo y
          el Enter no envía el formulario. Es el mismo código que luego se lee en
          el punto de venta para cobrar sin buscar el producto.
        </p>
      )}
    </div>
  );
}
