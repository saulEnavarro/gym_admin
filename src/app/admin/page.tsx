import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvisionForm } from "@/components/admin/provision-form";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Database } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Administración de la plataforma" };
export const dynamic = "force-dynamic";

type OrgRow =
  Database["public"]["Functions"]["platform_organizations"]["Returns"][number];

export default async function PlatformAdminPage() {
  await requireSession();
  const supabase = await createClient();

  // El acceso se decide aquí, en el servidor. Si no eres operador de la
  // plataforma, esta pantalla no existe para ti.
  const { data: isPlatform } = await supabase.rpc("is_platform_admin");
  if (!isPlatform) redirect("/dashboard");

  // Un fallo aquí no puede quedar como «no hay gimnasios»: son cosas muy
  // distintas y la segunda se ve normal.
  const { data, error } = await supabase.rpc("platform_organizations");
  const orgs = (data ?? []) as OrgRow[];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Administración de la plataforma
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Ir a mi gimnasio
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gimnasios</h1>
          <p className="text-muted-foreground">
            Alta de nuevos inquilinos. Esta pantalla{" "}
            <strong className="text-foreground">no muestra sus datos</strong>:
            sólo cuántos hay, para no abrir una puerta al aislamiento entre
            gimnasios.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dar de alta un gimnasio</CardTitle>
          </CardHeader>
          <CardContent>
            <ProvisionForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {orgs.length} {orgs.length === 1 ? "gimnasio" : "gimnasios"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <p
                role="alert"
                className="px-6 pb-6 text-sm text-destructive"
              >
                No se pudo leer la lista de gimnasios: {error.message}
              </p>
            ) : orgs.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                Todavía no hay gimnasios dados de alta.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Gimnasio</th>
                      <th className="px-6 py-3 text-right font-medium">Sucursales</th>
                      <th className="px-6 py-3 text-right font-medium">Equipo</th>
                      <th className="px-6 py-3 text-right font-medium">Socios</th>
                      <th className="px-6 py-3 text-right font-medium">
                        Ventas 30 d
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-6 py-3">
                          <span className="font-medium">{o.name}</span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {o.slug}
                          </span>
                          {!o.is_active && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">{o.branches}</td>
                        <td className="px-6 py-3 text-right">{o.staff}</td>
                        <td className="px-6 py-3 text-right">{o.clients}</td>
                        <td className="px-6 py-3 text-right">{o.sales_30d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
