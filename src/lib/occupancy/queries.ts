import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Returns<T extends keyof Database["public"]["Functions"]> =
  Database["public"]["Functions"][T]["Returns"];

export type OccupancyNow = Returns<"occupancy_now">[number];
export type OccupancyHour = Returns<"occupancy_by_hour">[number];
export type OccupancyWeekdayHour = Returns<"occupancy_by_weekday_hour">[number];
export type AccessSummary = Returns<"access_summary">[number];

export const EMPTY_NOW: OccupancyNow = { inside: 0, capacity: 0, pct: 0 };

export const EMPTY_SUMMARY: AccessSummary = {
  visits: 0,
  unique_clients: 0,
  avg_minutes: 0,
  visits_per_day: 0,
  estimated_pct: 0,
  authorized: 0,
};

function args(
  from: string,
  to: string,
  timeZone: string,
  branchId: string | null,
) {
  return {
    p_from: from,
    p_to: to,
    p_tz: timeZone,
    ...(branchId ? { p_branch: branchId } : {}),
  };
}

/** Personas dentro ahora + aforo. Consulta normal: no hace falta Realtime. */
export async function getOccupancyNow(
  branchId: string | null,
): Promise<OccupancyNow> {
  const supabase = await createClient();
  const { data } = await supabase.rpc(
    "occupancy_now",
    branchId ? { p_branch: branchId } : {},
  );
  return (data?.[0] as OccupancyNow | undefined) ?? EMPTY_NOW;
}

/** Todo el panel de ocupación en un viaje. */
export async function getOccupancyReport(
  from: string,
  to: string,
  timeZone: string,
  branchId: string | null,
) {
  const supabase = await createClient();
  const a = args(from, to, timeZone, branchId);

  const [now, byHour, byWeekdayHour, summary] = await Promise.all([
    supabase.rpc("occupancy_now", branchId ? { p_branch: branchId } : {}),
    supabase.rpc("occupancy_by_hour", a),
    supabase.rpc("occupancy_by_weekday_hour", a),
    supabase.rpc("access_summary", a),
  ]);

  return {
    now: (now.data?.[0] as OccupancyNow | undefined) ?? EMPTY_NOW,
    byHour: (byHour.data ?? []) as OccupancyHour[],
    byWeekdayHour: (byWeekdayHour.data ?? []) as OccupancyWeekdayHour[],
    summary: (summary.data?.[0] as AccessSummary | undefined) ?? EMPTY_SUMMARY,
  };
}
