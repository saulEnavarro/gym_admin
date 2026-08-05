import type { Metadata } from "next";
import {
  Building2,
  Users,
  Coins,
  CreditCard,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Panel" };

export default async function DashboardPage() {
  const { profile, organization, branding } = await requireSession();
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // RLS garantiza que estos datos son SÓLO de la organización del usuario.
  const [
    { count: branchCount },
    { count: teamCount },
    { count: activeClients },
    { data: todaySales },
  ] = await Promise.all([
    supabase.from("branches").select("*", { count: "exact", head: true }),
    supabase
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .neq("role", "client"),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("sales")
      .select("total")
      .eq("status", "completed")
      .gte("sold_at", startOfToday.toISOString()),
  ]);

  const revenueToday = (todaySales ?? []).reduce(
    (sum, s) => sum + Number(s.total),
    0,
  );
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "de nuevo";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {firstName}</h1>
        <p className="text-muted-foreground">
          Resumen de {organization?.name}.
        </p>
      </div>

      {/* KPIs disponibles en Fase 0 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          label="Sucursales"
          value={String(branchCount ?? 0)}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Equipo"
          value={String(teamCount ?? 0)}
        />
        <StatCard
          icon={<Coins className="h-5 w-5" />}
          label="Moneda"
          value={branding?.currency ?? "MXN"}
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Idioma"
          value={branding?.locale ?? "es-MX"}
        />
      </div>

      {/* Métricas que llegan en Fase 1 (placeholders honestos) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Clientes activos"
          value={String(activeClients ?? 0)}
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5" />}
          label="Ingresos de hoy"
          value={formatCurrency(revenueToday, currency, locale)}
          hint="Ventas completadas, IVA incluido"
        />
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Membresías por vencer"
          value="—"
          hint="Disponible en Fase 2"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-success" />
            Cimientos listos
          </CardTitle>
          <CardDescription>
            La base multi-inquilino está activa y aislada por organización.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>✅ Aislamiento multi-tenant con RLS en todas las tablas</li>
            <li>✅ Autenticación y roles por organización</li>
            <li>✅ Personalización por organización (branding)</li>
            <li>✅ Logs de auditoría</li>
            <li>✅ Modo claro/oscuro y layout responsive</li>
            <li>⏭️ Siguiente: Fase 1 — Clientes, membresías y POS</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
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
          {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
