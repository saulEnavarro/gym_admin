import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">Recuperar contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace para poner una nueva.
          </p>
        </div>
        <ForgotPasswordForm surface="staff" loginHref="/login" />
      </div>
    </div>
  );
}
