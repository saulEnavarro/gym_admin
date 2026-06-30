import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

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

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Acceso del personal</CardTitle>
            <CardDescription>
              Ingresa con tu correo y contraseña para administrar tu gimnasio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <LoginForm redirectTo={redirect} />

            <div className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">
                Cuentas demo (datos de prueba)
              </p>
              <p>admin@iron-temple.test · Password123!</p>
              <p>admin@fitzone.test · Password123!</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
