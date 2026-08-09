"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Mail, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  inviteTeamMember,
  updateTeamMember,
  type TeamFormState,
} from "@/app/(app)/team/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/types/database.types";

const STAFF_ROLES: AppRole[] = ["admin", "manager", "receptionist", "instructor"];

export type TeamMember = {
  id: string;
  user_id: string;
  role: AppRole;
  is_active: boolean;
  full_name: string | null;
  email: string | null;
  branch_ids: string[];
};

type BranchOption = { id: string; name: string };

const initial: TeamFormState = { error: null, ok: null };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: TeamFormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p className="flex items-start gap-2 text-sm text-success">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        {state.ok}
      </p>
    );
  }
  return null;
}

/** Casillas de sucursal. Un admin las ve todas aunque no marque ninguna. */
function BranchPicker({
  branches,
  selected,
  role,
}: {
  branches: BranchOption[];
  selected: string[];
  role: AppRole;
}) {
  if (branches.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label>Sucursales que opera</Label>
      <div className="flex flex-wrap gap-3">
        {branches.map((b) => (
          <label key={b.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="branch_ids"
              value={b.id}
              defaultChecked={selected.includes(b.id)}
              className="h-4 w-4 rounded border-input"
            />
            {b.name}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {role === "admin"
          ? "Un administrador opera todas las sucursales aunque no marques ninguna."
          : "Sin sucursales marcadas no podrá abrir turno de caja ni registrar accesos."}
      </p>
    </div>
  );
}

export function TeamManager({
  members,
  branches,
}: {
  members: TeamMember[];
  branches: BranchOption[];
}) {
  const [inviteState, inviteAction] = useActionState<TeamFormState, FormData>(
    inviteTeamMember,
    initial,
  );
  const [updateState, updateAction] = useActionState<TeamFormState, FormData>(
    updateTeamMember,
    initial,
  );
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<AppRole>("receptionist");


  return (
    <div className="space-y-6">
      {!inviting ? (
        <Button onClick={() => setInviting(true)}>
          <UserPlus className="h-4 w-4" />
          Invitar a alguien
        </Button>
      ) : (
        <Card>
          <CardContent className="p-6">
            <form action={inviteAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo *</Label>
                  <Input id="email" name="email" type="email" required autoFocus />
                  <p className="text-xs text-muted-foreground">
                    Le llegará una invitación para poner su contraseña.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre</Label>
                  <Input id="full_name" name="full_name" maxLength={160} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select
                    id="role"
                    name="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as AppRole)}
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <BranchPicker branches={branches} selected={[]} role={inviteRole} />
              <Feedback state={inviteState} />

              <div className="flex gap-2">
                <Submit label="Enviar invitación" />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setInviting(false)}
                >
                  Cerrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="px-6 py-4">
                {editing === m.id ? (
                  <form action={updateAction} className="space-y-4">
                    <input type="hidden" name="member_id" value={m.id} />
                    <p className="font-medium">{m.full_name || m.email}</p>

                    <div className="space-y-2">
                      <Label htmlFor={`role-${m.id}`}>Rol</Label>
                      <Select
                        id={`role-${m.id}`}
                        name="role"
                        defaultValue={m.role}
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <BranchPicker
                      branches={branches}
                      selected={m.branch_ids}
                      role={m.role}
                    />

                    <label className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={m.is_active}
                        className="h-4 w-4 rounded border-input"
                      />
                      Activo
                    </label>

                    <Feedback state={updateState} />

                    <div className="flex gap-2">
                      <Submit label="Guardar" />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditing(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3",
                      !m.is_active && "opacity-60",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {m.full_name || "Sin nombre"}
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {ROLE_LABELS[m.role]}
                        </span>
                        {!m.is_active && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Inactivo
                          </span>
                        )}
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {m.email ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.role === "admin"
                          ? "Todas las sucursales"
                          : m.branch_ids.length === 0
                            ? "Sin sucursales asignadas"
                            : branches
                                .filter((b) => m.branch_ids.includes(b.id))
                                .map((b) => b.name)
                                .join(" · ")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(m.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
