import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { SetPasswordForm } from "./set-password-form";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Portal del cliente · Crear contraseña" };

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <KeyRound className="h-5 w-5" />
          </span>
          Portal del cliente
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Crea tu contraseña</CardTitle>
            <CardDescription>
              Define una contraseña para acceder a tu portal. La próxima vez
              podrás entrar directamente en la página de acceso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SetPasswordForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
