"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  LayoutDashboard,
  Building2,
  Users,
  Palette,
  ScrollText,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  available: boolean;
};

// Módulos previstos. En Fase 0 sólo el Panel está activo; el resto se habilita
// en fases siguientes (marcados con la etiqueta "Pronto").
const NAV: NavItem[] = [
  { label: "Panel", href: "/dashboard", icon: LayoutDashboard, available: true },
  { label: "Sucursales", href: "/branches", icon: Building2, available: false },
  { label: "Equipo", href: "/team", icon: Users, available: false },
  { label: "Personalización", href: "/branding", icon: Palette, available: false },
  { label: "Auditoría", href: "/audit", icon: ScrollText, available: false },
  { label: "Configuración", href: "/settings", icon: Settings, available: false },
];

export type AppShellProps = {
  children: React.ReactNode;
  org: { name: string; displayName: string };
  user: { name: string; email: string; roleLabel: string };
};

export function AppShell({ children, org, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Dumbbell className="h-4 w-4" />
        </span>
        <span className="truncate">{org.displayName || org.name}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          if (!item.available) {
            return (
              <div
                key={item.href}
                className="flex cursor-default items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/60"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Pronto
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
            {user.roleLabel}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — escritorio */}
      <aside className="hidden w-64 shrink-0 border-r border-border md:block">
        {sidebar}
      </aside>

      {/* Sidebar — móvil (overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-background">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-accent md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">{org.name}</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
