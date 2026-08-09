import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { SetPasswordForm } from "@/components/auth/staff-set-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

/**
 * Fija la contraseña del STAFF: sirve tanto para la invitación al equipo como
 * para la recuperación. El portal tiene la suya en /portal/set-password porque
 * al terminar cada una manda a su propia superficie.
 */
export default function StaffSetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <Dumbbell className="mx-auto h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">Tu contraseña</h1>
          <p className="text-sm text-muted-foreground">
            Elige una contraseña para entrar al panel.
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </div>
  );
}
