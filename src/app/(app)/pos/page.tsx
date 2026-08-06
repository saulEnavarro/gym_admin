import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, MapPin, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { getOpenCashSession } from "@/lib/cash/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Punto de venta" };

export default async function PosPage() {
  const { user, branding } = await requireSession();
  const supabase = await createClient();
  const currency = branding?.currency ?? "MXN";
  const locale = branding?.locale ?? "es-MX";

  // Sin turno de caja abierto la BD rechaza la venta: se pide abrirlo antes.
  const session = await getOpenCashSession(user.id);

  // RLS acota todo a la organización del cajero.
  const [{ data: plans }, { data: clients }] = await Promise.all([
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

      {!session ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Banknote className="h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="font-medium">No tienes un turno de caja abierto</p>
              <p className="text-sm text-muted-foreground">
                Toda venta se registra dentro de un turno para que el corte
                cuadre. Abre el tuyo con su fondo inicial para empezar a vender.
              </p>
            </div>
            <Link href="/cash" className={buttonVariants()}>
              <Banknote className="h-4 w-4" />
              Abrir turno de caja
            </Link>
          </CardContent>
        </Card>
      ) : (plans ?? []).length === 0 ? (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No hay membresías activas.{" "}
          <Link href="/memberships/new" className="text-primary hover:underline">
            Crea una membresía
          </Link>{" "}
          para poder vender.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="inline-flex items-center gap-2 font-medium">
              <span className="inline-flex h-2 w-2 rounded-full bg-success" />
              Turno abierto
            </span>
            {session.branchName && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {session.branchName}
              </span>
            )}
            {/* Nunca el efectivo esperado: el arqueo es a ciegas (ver /cash). */}
            <span className="text-muted-foreground">
              Vendido en el turno:{" "}
              {formatCurrency(
                Number(session.totals?.cash_sales ?? 0) +
                  Number(session.totals?.card_sales ?? 0) +
                  Number(session.totals?.transfer_sales ?? 0),
                currency,
                locale,
              )}
            </span>
            <Link
              href="/cash"
              className="ml-auto text-primary hover:underline"
            >
              Ver caja
            </Link>
          </div>

          <PosTerminal
            clients={clients ?? []}
            plans={plans ?? []}
            currency={currency}
            locale={locale}
          />
        </>
      )}
    </div>
  );
}
