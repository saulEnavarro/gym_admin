"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import { importClients, type ImportState } from "@/app/(app)/clients/import-actions";
import { Button } from "@/components/ui/button";

const initialState: ImportState = { error: null };

function SubmitButton({ hasFile }: { hasFile: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !hasFile}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
      {pending ? "Importando…" : "Importar"}
    </Button>
  );
}

export function ClientImportDropzone() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction] = useActionState(importClients, initialState);

  // Al terminar con éxito, refresca la lista de clientes del servidor.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  function assignFile(file: File | null) {
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    if (inputRef.current) inputRef.current.files = dt.files;
    setFileName(file.name);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    assignFile(e.dataTransfer.files?.[0] ?? null);
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UploadCloud className="h-4 w-4" />
        Importar Excel
      </Button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileSpreadsheet className="h-4 w-4" />
          Importar clientes desde Excel/CSV
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form action={formAction} className="space-y-3">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/40",
          ].join(" ")}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          {fileName ? (
            <span className="text-sm font-medium">{fileName}</span>
          ) : (
            <>
              <span className="text-sm font-medium">
                Arrastra un archivo aquí o haz clic para elegirlo
              </span>
              <span className="text-xs text-muted-foreground">
                .xlsx o .csv · una columna «Nombre» (opcional «Apellidos», «Correo», «Celular»)
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".xlsx,.csv"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>

        {state.error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </div>
        )}
        {state.ok && (
          <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Se importaron {state.imported} clientes
            {state.skipped ? ` (${state.skipped} filas sin nombre omitidas)` : ""}.
          </div>
        )}

        <div className="flex items-center gap-2">
          <SubmitButton hasFile={fileName !== null} />
          <span className="text-xs text-muted-foreground">
            Los números de socio se asignan automáticamente.
          </span>
        </div>
      </form>
    </div>
  );
}
