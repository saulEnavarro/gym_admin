import Link from "next/link";
import { Dumbbell, Home, Receipt, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Chrome del portal del cliente: encabezado con la marca de su gimnasio,
 * navegación (Inicio / Historial), tema y cierre de sesión. El logout usa la
 * ruta compartida /auth/signout con destino al login del portal.
 */
export function PortalShell({
  orgName,
  clientName,
  children,
}: {
  orgName: string;
  clientName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="truncate">{orgName}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <input type="hidden" name="redirectTo" value="/portal/login" />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-4">
          <NavLink href="/portal" icon={<Home className="h-4 w-4" />}>
            Inicio
          </NavLink>
          <NavLink href="/portal/history" icon={<Receipt className="h-4 w-4" />}>
            Historial
          </NavLink>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Hola, <span className="font-medium text-foreground">{clientName}</span>
        </p>
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
