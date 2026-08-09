import type { Metadata } from "next";
import {
  Activity,
  Clock,
  Gauge,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HourlyOccupancyChart,
  WeekHeatmap,
} from "@/components/occupancy/occupancy-charts";
import { getOccupancyReport } from "@/lib/occupancy/queries";
import { hourLabel, peakAndQuiet } from "@/lib/occupancy/helpers";
import { formatStay } from "@/lib/access/helpers";
import { addDays, todayInTz } from "@/lib/reports/period";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Ocupación" };

export default async function OccupancyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branding } = await requireSession();
  const sp = await searchParams;
  const branchId = (Array.isArray(sp.branch) ? sp.branch[0] : sp.branch) ?? null;

  const timeZone = branding?.timezone ?? "America/Mexico_City";
  const color = branding?.primary_color ?? "#7c3aed";

  // Cuatro semanas: suficiente para que el patrón semanal se note sin arrastrar
  // temporadas viejas (enero de un gimnasio no se parece a marzo).
  const today = todayInTz(timeZone);
  const from = addDays(today, -27);

  const supabase = await createClient();
  const [{ data: branches }, report] = await Promise.all([
    supabase.from("branches").select("id, name, capacity").order("name"),
    getOccupancyReport(from, today, timeZone, branchId),
  ]);

  const { now, byHour, byWeekdayHour, summary } = report;
  const { peak, quiet } = peakAndQuiet(
    byHour.map((h) => ({ hour: h.hour, avg_inside: Number(h.avg_inside) })),
  );
  const pct = now.pct == null ? null : Number(now.pct);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Activity className="h-6 w-6 text-primary" />
          Ocupación
        </h1>
        <p className="text-muted-foreground">
          Últimas 4 semanas ·{" "}
          {branchId
            ? (branches ?? []).find((b) => b.id === branchId)?.name
            : "todas las sucursales"}
        </p>
      </div>

      {/* Aforo ahora */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/5">
            <span className="text-2xl font-bold text-primary">{now.inside}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Dentro ahora</p>
            {now.capacity ? (
              <>
                <p className="text-2xl font-semibold">
                  {pct}% <span className="text-base font-normal text-muted-foreground">de {now.capacity} de aforo</span>
                </p>
                <div className="mt-2 h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      (pct ?? 0) < 40
                        ? "bg-success"
                        : (pct ?? 0) < 75
                          ? "bg-amber-500"
                          : "bg-destructive",
                    )}
                    style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Define el aforo de la sucursal para ver el porcentaje.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Indicadores del periodo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Users className="h-5 w-5" />}
          label="Visitas"
          value={String(summary.visits)}
          hint={`${summary.unique_clients} socios distintos`}
        />
        <Kpi
          icon={<Gauge className="h-5 w-5" />}
          label="Visitas por día"
          value={String(Number(summary.visits_per_day))}
          hint="Días con actividad"
        />
        <Kpi
          icon={<Clock className="h-5 w-5" />}
          label="Permanencia media"
          value={summary.avg_minutes ? formatStay(summary.avg_minutes) : "—"}
          hint="Sólo salidas escaneadas"
        />
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="Hora pico"
          value={peak ? hourLabel(peak.hour) : "—"}
          hint={peak ? `${peak.avg_inside} personas en promedio` : undefined}
        />
      </div>

      {Number(summary.estimated_pct) > 40 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          <span className="font-medium">
            {summary.estimated_pct}% de las visitas se cerraron solas.
          </span>{" "}
          <span className="text-muted-foreground">
            Los socios casi no escanean al salir, así que la permanencia media y
            la ocupación por hora son estimaciones a la baja. Pedir el escaneo de
            salida en recepción mejora ambos números.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ocupación por hora</CardTitle>
          <CardDescription>
            Personas dentro en promedio, no llegadas: por eso hay ocupación en
            horas sin entradas nuevas.
            {quiet && (
              <>
                {" "}
                La hora más tranquila es{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <TrendingDown className="h-3.5 w-3.5" />
                  {hourLabel(quiet.hour)}
                </span>
                .
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HourlyOccupancyChart
            data={byHour.map((h) => ({
              hour: h.hour,
              avg_inside: Number(h.avg_inside),
            }))}
            color={color}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Semana típica</CardTitle>
          <CardDescription>
            Qué tan lleno suele estar cada día a cada hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeekHeatmap
            data={byWeekdayHour.map((r) => ({
              weekday: r.weekday,
              hour: r.hour,
              avg_inside: Number(r.avg_inside),
            }))}
            color={color}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold">{value}</p>
          {hint && (
            <p className="truncate text-xs text-muted-foreground/70">{hint}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
