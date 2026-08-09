"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { hourLabel, weekdayLabel } from "@/lib/occupancy/helpers";
import { cn } from "@/lib/utils";

const axis = {
  stroke: "currentColor",
  strokeOpacity: 0.25,
  tick: { fill: "currentColor", fontSize: 12 },
  tickLine: false,
} as const;

const tooltip = {
  contentStyle: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    color: "hsl(var(--popover-foreground))",
    fontSize: "0.8125rem",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
  cursor: { fill: "currentColor", fillOpacity: 0.06 },
};

/** Ocupación media por hora del día, con la hora pico resaltada. */
export function HourlyOccupancyChart({
  data,
  color,
}: {
  data: { hour: number; avg_inside: number }[];
  color: string;
}) {
  const rows = data.map((d) => ({
    ...d,
    avg_inside: Number(d.avg_inside),
    label: hourLabel(d.hour),
  }));
  const peak = Math.max(...rows.map((r) => r.avg_inside), 0);

  if (peak === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Todavía no hay accesos registrados en el periodo.
      </div>
    );
  }

  return (
    <div className="text-muted-foreground">
      <ResponsiveContainer width="100%" height={240}>
        {/* Los ejes van como hijos DIRECTOS: Recharts los busca por tipo. */}
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="label" {...axis} interval={3} />
          <YAxis {...axis} width={36} allowDecimals={false} />
          <Tooltip
            {...tooltip}
            formatter={(v: number) => [`${v} personas en promedio`, "Dentro"]}
          />
          <Bar dataKey="avg_inside" radius={[4, 4, 0, 0]}>
            {rows.map((r, i) => (
              <Cell
                key={i}
                fill={color}
                fillOpacity={r.avg_inside === peak ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Mapa de calor día × hora. Va en CSS y no en Recharts a propósito: una rejilla
 * de 7×24 celdas es más legible así, y no carga una librería para pintarla.
 */
export function WeekHeatmap({
  data,
  color,
}: {
  data: { weekday: number; hour: number; avg_inside: number }[];
  color: string;
}) {
  const max = Math.max(...data.map((d) => Number(d.avg_inside)), 0);
  if (max === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay suficientes accesos para dibujar el mapa.
      </p>
    );
  }

  const byKey = new Map(
    data.map((d) => [`${d.weekday}-${d.hour}`, Number(d.avg_inside)]),
  );
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] space-y-1">
        <div className="flex gap-1 pl-10">
          {hours.map((h) => (
            <div
              key={h}
              className="flex-1 text-center text-[10px] text-muted-foreground"
            >
              {h % 4 === 0 ? hourLabel(h).slice(0, 2) : ""}
            </div>
          ))}
        </div>

        {[1, 2, 3, 4, 5, 6, 7].map((wd) => (
          <div key={wd} className="flex items-center gap-1">
            <div className="w-9 shrink-0 text-xs text-muted-foreground">
              {weekdayLabel(wd)}
            </div>
            {hours.map((h) => {
              const v = byKey.get(`${wd}-${h}`) ?? 0;
              const intensity = max === 0 ? 0 : v / max;
              return (
                <div
                  key={h}
                  title={`${weekdayLabel(wd)} ${hourLabel(h)} · ${v} en promedio`}
                  className={cn(
                    "h-6 flex-1 rounded-[3px] border border-border/40",
                    v === 0 && "bg-muted/40",
                  )}
                  style={
                    v > 0
                      ? {
                          backgroundColor: color,
                          // Un piso de 0.15 para que una hora con poca gente se
                          // distinga de una hora cerrada.
                          opacity: 0.15 + intensity * 0.85,
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>
        ))}

        <div className="flex items-center justify-end gap-2 pt-1 text-[10px] text-muted-foreground">
          <span>Menos</span>
          {[0.15, 0.4, 0.65, 1].map((o) => (
            <div
              key={o}
              className="h-3 w-6 rounded-[3px]"
              style={{ backgroundColor: color, opacity: o }}
            />
          ))}
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}
