"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database.types";
import {
  SUPABASE_STORAGE_KEY,
  supabaseAnonKey,
  supabaseBrowserUrl,
} from "./config";

/** Cliente Supabase para componentes del NAVEGADOR ('use client'). */
export function createClient() {
  return createBrowserClient<Database>(supabaseBrowserUrl, supabaseAnonKey, {
    auth: { storageKey: SUPABASE_STORAGE_KEY },
  });
}
