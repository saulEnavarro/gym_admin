import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { PortalLoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Portal del cliente · Acceso" };

export default async function PortalLoginPage({
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
            <UserRound className="h-5 w-5" />
          </span>
          Portal del cliente
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Bienvenido</CardTitle>
            <CardDescription>
              Consulta el estado de tu membresía, tus días restantes y tu
              historial. Ingresa con el correo con el que te registró tu
              gimnasio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortalLoginForm redirectTo={redirect} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
