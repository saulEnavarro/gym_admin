"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import type { ReminderOffsetKey } from "@/lib/types/database.types";

const MANAGE_ROLES = ["admin", "manager"];
const ALL_OFFSETS: ReminderOffsetKey[] = [
  "minus_7",
  "minus_3",
  "day_0",
  "plus_7",
  "plus_30",
];

export type ReminderSettingsState = { error: string | null; ok?: boolean };

/** Guarda los ajustes de recordatorios de la organización (admin/gerente). */
export async function updateReminderSettings(
  _prev: ReminderSettingsState,
  formData: FormData,
): Promise<ReminderSettingsState> {
  const { membership } = await requireSession();
  if (!membership) return { error: "Tu cuenta no tiene organización." };
  if (!MANAGE_ROLES.includes(membership.role)) {
    return { error: "No tienes permiso para cambiar estos ajustes." };
  }

  const enabled = formData.get("enabled") === "on";
  const selected = formData.getAll("offset").map(String);
  const offsets_enabled = ALL_OFFSETS.filter((k) => selected.includes(k));

  const supabase = await createClient();
  const { error } = await supabase.from("org_reminder_settings").upsert(
    {
      org_id: membership.org_id,
      enabled,
      offsets_enabled,
    },
    { onConflict: "org_id" },
  );

  if (error) {
    return { error: "No se pudieron guardar los ajustes. Intenta de nuevo." };
  }

  revalidatePath("/settings/reminders");
  return { error: null, ok: true };
}
