import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { BrandingForm } from "@/components/branding/branding-form";
import { getSignedUrl, ORG_LOGOS_BUCKET } from "@/lib/storage";
import type { OrgBranding } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Personalización" };

export default async function BrandingPage() {
  const { membership } = await requireSession();
  if (!membership) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("org_branding")
    .select("*")
    .eq("org_id", membership.org_id)
    .maybeSingle();

  if (!data) notFound();

  const branding = data as OrgBranding;
  const photoUrl = await getSignedUrl(ORG_LOGOS_BUCKET, branding.logo_url);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Palette className="h-6 w-6 text-primary" />
          Personalización
        </h1>
        <p className="text-muted-foreground">
          Foto, nombre, color, moneda y datos de contacto de tu gimnasio.
        </p>
      </div>

      <BrandingForm branding={branding} photoUrl={photoUrl} />
    </div>
  );
}
