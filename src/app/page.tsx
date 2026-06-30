import Link from "next/link";
import { Dumbbell, ArrowRight } from "lucide-react";
import { getSessionContext } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export default async function Home() {
  const ctx = await getSessionContext();
  const targetHref = ctx ? "/dashboard" : "/login";
  const targetLabel = ctx ? "Ir al panel" : "Acceder al panel";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="h-5 w-5" />
          </span>
          Registro Gym
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          SaaS multi-sucursal · México
        </span>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          La plataforma para administrar tu gimnasio de principio a fin
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-muted-foreground">
          Clientes, membresías, caja, accesos y reportes. Segura, moderna y
          lista para crecer contigo y tus sucursales.
        </p>
        <div className="mt-8">
          <Link href={targetHref} className={cn(buttonVariants({ size: "lg" }))}>
            {targetLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Registro Gym · Fase 0 — Cimientos
      </footer>
    </div>
  );
}
