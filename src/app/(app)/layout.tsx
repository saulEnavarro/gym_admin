import { requireSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { BrandStyle } from "@/components/brand-style";
import { roleLabel } from "@/lib/auth/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, membership, organization, branding } =
    await requireSession();

  // Usuario autenticado pero sin organización asignada (onboarding pendiente).
  if (!membership || !organization) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">Cuenta sin organización</h1>
        <p className="max-w-md text-muted-foreground">
          Tu cuenta aún no está asociada a ninguna organización. Pide a un
          administrador que te invite, o contacta a soporte.
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <BrandStyle primaryColor={branding?.primary_color ?? "#4f46e5"} />
      <AppShell
        org={{
          name: organization.name,
          displayName: branding?.display_name ?? organization.name,
        }}
        user={{
          name: profile?.full_name ?? user.email ?? "Usuario",
          email: user.email ?? "",
          roleLabel: roleLabel(membership.role),
        }}
      >
        {children}
      </AppShell>
    </>
  );
}
