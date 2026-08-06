"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

/**
 * Gráficas del corte.
 *
 * Sobre el color: Recharts pinta atributos de presentación SVG, donde `var()`
 * NO se resuelve — por eso el color de marca llega como prop (hex, desde
 * `org_branding.primary_color`) y los grises usan `currentColor` heredado de
 * una clase de Tailwind, que sí funciona y respeta el modo claro/oscuro.
 */

type Money = { currency: string; locale: string; color: string };

const axis = {
  stroke: "currentColor",
  strokeOpacity: 0.25,
  tick: { fill: "currentColor", fontSize: 12 },
  tickLine: false,
} as const;

function tooltipStyle() {
  // Estilos en línea: aquí sí se resuelven las variables CSS del tema.
  return {
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
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Ingresos por día del periodo. */
export function RevenueChart({
  data,
  currency,
  locale,
  color,
}: Money & { data: { day: string; total: number; sales_count: number }[] }) {
  if (data.every((d) => Number(d.total) === 0)) {
    return <Empty>Sin ventas en el periodo.</Empty>;
  }

  const rows = data.map((d) => ({
    ...d,
    total: Number(d.total),
    // "05 ago" — etiqueta corta para que quepan 31 días.
    label: new Date(`${d.day}T12:00:00Z`).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
    }),
  }));

  const money = (v: number) => formatCurrency(v, currency, locale);

  // Ojo: los ejes, la rejilla y el tooltip van como hijos DIRECTOS del gráfico.
  // Recharts inspecciona `children` por tipo para armarlo, así que agruparlos en
  // un fragmento —por no repetirlos entre las dos variantes— deja el lienzo en
  // blanco. Se repiten a propósito.
  const margin = { top: 8, right: 8, bottom: 0, left: 8 };

  // Un área necesita varios puntos para decir algo: con el corte diario
  // quedaría un punto suelto flotando. En ese caso se usa una barra.
  if (rows.length < 3) {
    return (
      <div className="text-muted-foreground">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows} margin={margin}>
            <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis {...axis} width={70} tickFormatter={money} />
            <Tooltip
              {...tooltipStyle()}
              formatter={(v: number) => [money(v), "Ingresos"]}
            />
            <Bar dataKey="total" fill={color} radius={[4, 4, 0, 0]} maxBarSize={90} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={rows} margin={margin}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="label" {...axis} minTickGap={16} />
          <YAxis {...axis} width={70} tickFormatter={money} />
          <Tooltip
            {...tooltipStyle()}
            formatter={(v: number) => [money(v), "Ingresos"]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={color}
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ventas por membresía: la más vendida arriba, la menos vendida abajo. */
export function PlansChart({
  data,
  currency,
  locale,
  color,
}: Money & { data: { plan_name: string; quantity: number; total: number }[] }) {
  if (data.length === 0) return <Empty>Sin ventas en el periodo.</Empty>;

  const rows = data.map((d) => ({ ...d, total: Number(d.total) }));

  return (
    <div className="text-muted-foreground">
      <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 44)}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid
            stroke="currentColor"
            strokeOpacity={0.15}
            horizontal={false}
          />
          <XAxis
            type="number"
            {...axis}
            tickFormatter={(v: number) => formatCurrency(v, currency, locale)}
          />
          <YAxis type="category" dataKey="plan_name" {...axis} width={110} />
          <Tooltip
            {...tooltipStyle()}
            formatter={(v: number, _n, item) => [
              `${formatCurrency(v, currency, locale)} · ${
                (item?.payload as { quantity: number })?.quantity ?? 0
              } vendidas`,
              "Total",
            ]}
          />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={26}>
            {rows.map((_, i) => (
              // La más vendida a color pleno; el resto se va apagando.
              <Cell
                key={i}
                fill={color}
                fillOpacity={Math.max(0.35, 1 - i * 0.15)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Ventas por hora del día: dónde está la hora pico de mostrador. */
export function HoursChart({
  data,
  currency,
  locale,
  color,
}: Money & { data: { hour: number; sales_count: number; total: number }[] }) {
  if (data.every((d) => d.sales_count === 0)) {
    return <Empty>Sin ventas en el periodo.</Empty>;
  }

  const rows = data.map((d) => ({
    ...d,
    total: Number(d.total),
    label: `${String(d.hour).padStart(2, "0")}:00`,
  }));
  const peak = Math.max(...rows.map((r) => r.sales_count));

  return (
    <div className="text-muted-foreground">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid
            stroke="currentColor"
            strokeOpacity={0.15}
            vertical={false}
          />
          {/* Una etiqueta cada 4 horas: las 24 juntas se encilman. */}
          <XAxis dataKey="label" {...axis} interval={3} />
          <YAxis {...axis} width={32} allowDecimals={false} />
          <Tooltip
            {...tooltipStyle()}
            formatter={(v: number, _n, item) => [
              `${v} ventas · ${formatCurrency(
                (item?.payload as { total: number })?.total ?? 0,
                currency,
                locale,
              )}`,
              "Hora",
            ]}
          />
          <Bar dataKey="sales_count" radius={[4, 4, 0, 0]}>
            {rows.map((r, i) => (
              // Se resalta la hora pico para que salte a la vista.
              <Cell
                key={i}
                fill={color}
                fillOpacity={r.sales_count === peak ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
