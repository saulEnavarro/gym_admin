import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { supabaseServerUrl } from "./config";

/**
 * Cliente con la SERVICE ROLE KEY: ⚠️ BYPASSEA RLS por completo.
 *
 * Úsalo SÓLO en código de servidor de confianza para flujos privilegiados
 * (onboarding de organizaciones, jobs, webhooks). NUNCA lo importes en código
 * de cliente. El import "server-only" hace fallar el build si se intenta.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está definida. No se puede crear el cliente admin.",
    );
  }

  return createSupabaseClient<Database>(supabaseServerUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
