import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { PosTerminal } from "@/components/pos/pos-terminal";

export const metadata: Metadata = { title: "Punto de venta" };

export default async function PosPage() {
  const { branding } = await requireSession();
  const supabase = await createClient();

  // RLS acota todo a la organización del cajero.
  const [{ data: plans }, { data: clients }, { data: branches }] =
    await Promise.all([
      supabase
        .from("membership_plans")
        .select("id, name, price, max_members, duration_days")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("clients")
        .select("id, member_number, first_name, last_name")
        .eq("is_active", true)
        .order("member_number", { ascending: false })
        .limit(1000),
      supabase
        .from("branches")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Punto de venta</h1>
          <p className="text-muted-foreground">
            Venta de membresías con desglose de IVA.
          </p>
        </div>
        <Link
          href="/pos/sales"
          className={buttonVariants({ variant: "outline" })}
        >
          <Receipt className="h-4 w-4" />
          Historial de ventas
        </Link>
      </div>

      {(plans ?? []).length === 0 ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No hay membresías activas.{" "}
          <Link href="/memberships/new" className="text-primary hover:underline">
            Crea una membresía
          </Link>{" "}
          para poder vender.
        </div>
      ) : (
        <PosTerminal
          clients={clients ?? []}
          plans={plans ?? []}
          branches={branches ?? []}
          currency={branding?.currency ?? "MXN"}
          locale={branding?.locale ?? "es-MX"}
        />
      )}
    </div>
  );
}
