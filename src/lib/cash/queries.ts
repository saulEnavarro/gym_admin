import { createClient } from "@/lib/supabase/server";
import type {
  CashMovement,
  CashSession,
  CashSessionTotals,
} from "@/lib/types/database.types";

export type CashSessionView = {
  session: CashSession;
  branchName: string | null;
  totals: CashSessionTotals | null;
};

/** Turno de caja abierto del usuario (o null si no tiene ninguno). */
export async function getOpenCashSession(
  userId: string,
): Promise<CashSessionView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("opened_by", userId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return hydrate(data as CashSession);
}

/** Turno por id (para el detalle del corte). */
export async function getCashSession(
  id: string,
): Promise<CashSessionView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return hydrate(data as CashSession);
}

/** Movimientos de un turno, del más reciente al más antiguo. */
export async function getSessionMovements(
  sessionId: string,
): Promise<CashMovement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_movements")
    .select("*")
    .eq("cash_session_id", sessionId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CashMovement[];
}

/** Completa el turno con el nombre de su sucursal y su desglose de totales. */
async function hydrate(session: CashSession): Promise<CashSessionView> {
  const supabase = await createClient();

  const [{ data: totals }, { data: branch }] = await Promise.all([
    supabase
      .from("cash_session_totals")
      .select("*")
      .eq("cash_session_id", session.id)
      .maybeSingle(),
    session.branch_id
      ? supabase
          .from("branches")
          .select("name")
          .eq("id", session.branch_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    session,
    branchName: branch?.name ?? null,
    totals: (totals as CashSessionTotals | null) ?? null,
  };
}
