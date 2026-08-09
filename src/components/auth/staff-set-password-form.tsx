"use client";

import { SetPasswordForm as BaseForm } from "@/app/portal/set-password/set-password-form";

/**
 * Misma mecánica que la del portal (el enlace del correo abre una sesión
 * temporal y con ella se fija la contraseña), pero al terminar manda al panel
 * en vez de al portal.
 */
export function SetPasswordForm() {
  return <BaseForm redirectTo="/dashboard" />;
}
