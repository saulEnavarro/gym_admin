"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Building2, CheckCircle2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { saveBranch, type BranchFormState } from "@/app/(app)/branches/actions";
import { cn } from "@/lib/utils";
import type { Branch } from "@/lib/types/database.types";

const TIMEZONES = [
  ["America/Mexico_City", "Ciudad de México"],
  ["America/Tijuana", "Tijuana"],
  ["America/Hermosillo", "Hermosillo"],
  ["America/Cancun", "Cancún"],
  ["America/Monterrey", "Monterrey"],
] as const;

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear sucursal"}
    </Button>
  );
}

export function BranchList({ branches }: { branches: Branch[] }) {
  const [state, formAction] = useActionState<BranchFormState, FormData>(
    saveBranch,
    { error: null, ok: null },
  );
  // null = formulario cerrado · "new" = alta · id = edición
  const [editing, setEditing] = useState<string | null>(null);
  const current = branches.find((b) => b.id === editing) ?? null;

  return (
    <div className="space-y-6">
      {editing === null ? (
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          Nueva sucursal
        </Button>
      ) : (
        <Card>
          <CardContent className="p-6">
            <form action={formAction} className="space-y-4">
              {current && <input type="hidden" name="id" value={current.id} />}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    maxLength={120}
                    defaultValue={current?.name ?? ""}
                    placeholder="Matriz, Sucursal Norte…"
                    autoFocus
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    name="address"
                    maxLength={400}
                    defaultValue={current?.address ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    maxLength={40}
                    defaultValue={current?.phone ?? ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Aforo máximo</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min={1}
                    defaultValue={current?.capacity ?? ""}
                    placeholder="Sin límite"
                  />
                  <p className="text-xs text-muted-foreground">
                    Necesario para ver el % de ocupación.
                  </p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="timezone">Zona horaria</Label>
                  <Select
                    id="timezone"
                    name="timezone"
                    defaultValue={current?.timezone ?? "America/Mexico_City"}
                  >
                    {TIMEZONES.map(([tz, label]) => (
                      <option key={tz} value={tz}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={current?.is_active ?? true}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <span>
                  Sucursal activa
                  <span className="block text-xs text-muted-foreground">
                    Si la apagas deja de aparecer para abrir turnos y vender,
                    pero conserva su historial.
                  </span>
                </span>
              </label>

              {state.error && (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {state.error}
                </p>
              )}
              {state.ok && (
                <p className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {state.ok}
                </p>
              )}

              <div className="flex gap-2">
                <SubmitButton editing={!!current} />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Cerrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Todavía no hay sucursales. Sin al menos una no se puede abrir turno
              de caja ni vender.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {branches.map((b) => (
                <li
                  key={b.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 px-6 py-4",
                    !b.is_active && "opacity-60",
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {b.name}
                      {!b.is_active && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Inactiva
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.address || "Sin dirección"}
                      {b.phone ? ` · ${b.phone}` : ""}
                      {b.capacity ? ` · aforo ${b.capacity}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(b.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
