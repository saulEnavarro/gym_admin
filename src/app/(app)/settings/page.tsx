import type { Metadata } from "next";
import Link from "next/link";
import {
  Settings,
  BellRing,
  Palette,
  Building2,
  Users,
  ScrollText,
  ChevronRight,
} from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { roleLabel } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Configuración" };

type Item = {
  href: string;
  label: string;
  description: string;
  icon: typeof Settings;
  /** Roles que pueden usarlo; si el rol actual no está, se muestra en gris. */
  roles: AppRole[];
};

const ITEMS: Item[] = [
  {
    href: "/branding",
    label: "Personalización",
    description:
      "Foto del establecimiento, nombre comercial, color, tipografía, moneda, idioma y datos de contacto.",
    icon: Palette,
    roles: ["admin"],
  },
  {
    href: "/settings/reminders",
    label: "Recordatorios",
    description:
      "Avisos de vencimiento por correo: qué momentos se envían y la cola de mensajes.",
    icon: BellRing,
    roles: ["admin", "manager"],
  },
  {
    href: "/branches",
    label: "Sucursales",
    description: "Alta y edición de las sucursales de tu gimnasio.",
    icon: Building2,
    roles: ["admin", "manager"],
  },
  {
    href: "/team",
    label: "Equipo",
    description:
      "Invitar personal, asignar roles y las sucursales a las que tiene acceso.",
    icon: Users,
    roles: ["admin"],
  },
  {
    href: "/audit",
    label: "Auditoría",
    description:
      "Bitácora de sólo lectura de los cambios sensibles: quién hizo qué y cuándo.",
    icon: ScrollText,
    roles: ["admin"],
  },
];

export default async function SettingsPage() {
  const { membership } = await requireSession();
  const role = membership?.role;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-6 w-6 text-primary" />
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Todo lo que define cómo trabaja tu gimnasio, en un solo lugar.
          {role && (
            <>
              {" "}
              Estás como{" "}
              <span className="font-medium text-foreground">
                {roleLabel(role)}
              </span>
              .
            </>
          )}
        </p>
      </div>

      <div className="grid gap-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const allowed = role ? item.roles.includes(role) : false;

          if (!allowed) {
            return (
              <Card key={item.href} className="opacity-60">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      {item.label}
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Sólo {item.roles.map(roleLabel).join(" / ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Link key={item.href} href={item.href} className="group block">
              <Card className="transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                <CardContent className="flex items-center gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.label}</div>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
