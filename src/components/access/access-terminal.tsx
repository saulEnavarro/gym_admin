"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import {
  CheckCircle2,
  DoorOpen,
  LogOut,
  ScanLine,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ClientCombobox, type ClientOption } from "@/components/pos/client-combobox";
import { registerAccess } from "@/app/(app)/access/actions";
import {
  daysLabel,
  denialLabel,
  formatStay,
  isOverridable,
  EMPTY_RESULT,
  type AccessResult,
} from "@/lib/access/helpers";
import { formatMemberNumber } from "@/lib/clients/helpers";
import { cn } from "@/lib/utils";

type Mode = "in" | "out";

function SubmitButton({ mode }: { mode: Mode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending
        ? "Registrando…"
        : mode === "in"
          ? "Registrar entrada"
          : "Registrar salida"}
    </Button>
  );
}

export function AccessTerminal({
  clients,
  branches,
}: {
  clients: ClientOption[];
  branches: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<AccessResult, FormData>(
    registerAccess,
    EMPTY_RESULT,
  );
  const [mode, setMode] = useState<Mode>("in");
  const [manual, setManual] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [override, setOverride] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // El lector de códigos de recepción se comporta como un teclado: teclea el
  // token y manda Enter. Para que eso funcione, el campo tiene que estar
  // enfocado siempre que no se esté capturando otra cosa.
  useEffect(() => {
    if (!manual && !override) scanRef.current?.focus();
  }, [manual, override, state]);

  // Tras un veredicto, se limpia el escaneo para el siguiente socio.
  useEffect(() => {
    if (state.status) {
      if (scanRef.current) scanRef.current.value = "";
      setOverride(false);
    }
  }, [state]);

  const denied = state.status === "denied";
  const canOverride = denied && isOverridable(state.reason) && mode === "in";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {/* Entrada / salida: el recepcionista lo fija y escanea en serie. */}
        <div className="inline-flex rounded-md border border-border p-1">
          {(
            [
              { value: "in" as Mode, label: "Entrada", icon: DoorOpen },
              { value: "out" as Mode, label: "Salida", icon: LogOut },
            ]
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setMode(t.value)}
                className={cn(
                  "inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors",
                  mode === t.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {branches.length > 1 && (
          <div className="space-y-1">
            <Label htmlFor="branch" className="text-xs">
              Sucursal
            </Label>
            <Select
              id="branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-56"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="branch_id" value={branchId} />

        {!manual ? (
          <div className="space-y-2">
            <Label htmlFor="token">Escanea el QR del socio</Label>
            <div className="relative">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={scanRef}
                id="token"
                name="token"
                autoComplete="off"
                placeholder="Esperando lectura…"
                className="h-14 pl-11 text-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              El lector escribe el código y lo envía solo. También puedes pegarlo
              a mano.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Busca al socio por nombre o número</Label>
            <ClientCombobox
              clients={clients}
              name="client_id"
              placeholder="Buscar socio…"
              onSelect={setClientId}
            />
          </div>
        )}

        {/* Autorización de una vencida: se exige motivo y queda auditado. */}
        {override && (
          <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
            <Label htmlFor="override_reason">
              Motivo de la autorización *
            </Label>
            <Input
              id="override_reason"
              name="override_reason"
              required
              autoFocus
              maxLength={300}
              placeholder="Ej. Renueva al salir"
            />
            {state.client && (
              <input type="hidden" name="client_id" value={state.client.id} />
            )}
            <p className="text-xs text-muted-foreground">
              Quedará registrado con tu nombre y este motivo.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton mode={mode} />
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setManual((v) => !v);
              setClientId(null);
              setOverride(false);
            }}
          >
            <UserRound className="h-4 w-4" />
            {manual ? "Volver al escaneo" : "Sin QR: buscar socio"}
          </Button>
          {manual && !clientId && (
            <span className="text-xs text-muted-foreground">
              Elige un socio para continuar.
            </span>
          )}
        </div>
      </form>

      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {state.status && <Verdict state={state} onOverride={() => setOverride(true)} canOverride={canOverride} />}
    </div>
  );
}

function Verdict({
  state,
  canOverride,
  onOverride,
}: {
  state: AccessResult;
  canOverride: boolean;
  onOverride: () => void;
}) {
  const ok =
    state.status === "granted" ||
    state.status === "authorized" ||
    state.status === "checked_out";
  const warn = state.status === "already_inside" || state.status === "not_inside";

  const title =
    state.status === "granted"
      ? "Adelante"
      : state.status === "authorized"
        ? "Acceso autorizado por recepción"
        : state.status === "checked_out"
          ? "Salida registrada"
          : state.status === "already_inside"
            ? "Ya está dentro"
            : state.status === "not_inside"
              ? "No tiene una visita abierta"
              : denialLabel(state.reason);

  return (
    <Card
      className={cn(
        "border-2",
        ok && "border-success/60 bg-success/5",
        warn && "border-amber-500/60 bg-amber-500/5",
        !ok && !warn && "border-destructive/60 bg-destructive/5",
      )}
    >
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        {/* La foto es el control anti-préstamo: el QR se puede compartir, la
            cara no. Va grande a propósito. */}
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {state.photoUrl ? (
            <Image
              src={state.photoUrl}
              alt=""
              fill
              sizes="128px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <UserRound className="h-12 w-12" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <p
            className={cn(
              "flex items-center gap-2 text-xl font-bold",
              ok && "text-success",
              warn && "text-amber-600 dark:text-amber-500",
              !ok && !warn && "text-destructive",
            )}
          >
            {ok ? (
              <CheckCircle2 className="h-6 w-6 shrink-0" />
            ) : warn ? (
              <ShieldAlert className="h-6 w-6 shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 shrink-0" />
            )}
            {title}
          </p>

          {state.client ? (
            <p className="text-lg">
              <span className="font-mono text-sm text-muted-foreground">
                {formatMemberNumber(state.client.member_number)}
              </span>{" "}
              <span className="font-medium">
                {state.client.first_name} {state.client.last_name}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">Sin socio identificado.</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {state.membership && (
              <span>
                {state.membership.plan_name} · vence{" "}
                {new Date(
                  `${state.membership.end_date}T12:00:00Z`,
                ).toLocaleDateString("es-MX")}
              </span>
            )}
            {daysLabel(state.days) && <span>{daysLabel(state.days)}</span>}
            {state.minutes != null && (
              <span>Estuvo {formatStay(state.minutes)}</span>
            )}
            {state.status === "authorized" && state.reason && (
              <span>({denialLabel(state.reason)})</span>
            )}
          </div>

          {canOverride && (
            <Button type="button" variant="outline" onClick={onOverride}>
              Autorizar de todos modos
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
