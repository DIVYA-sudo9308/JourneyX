import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  supabaseAnonKey,
  supabaseServiceKey,
  supabaseUrl,
} from "@/lib/supabase/env";

let readerClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/**
 * Server-side Supabase client used by the query layer. Prefers the service
 * role key so that server components can read every table regardless of RLS
 * or anon-role GRANT gaps (this key never crosses the server/client boundary
 * — the module is `"server-only"`). Falls back to the anon key when the
 * service key is not configured.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (readerClient) return readerClient;
  const url = supabaseUrl();
  const key = supabaseServiceKey() ?? supabaseAnonKey();
  if (!url || !key) return null;
  readerClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "journeyx-server" } },
  });
  return readerClient;
}

/**
 * Privileged client for the seed script only. Never imported from a client
 * component or from a Server Component that streams to the browser.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (serviceClient) return serviceClient;
  const url = supabaseUrl();
  const key = supabaseServiceKey();
  if (!url || !key) return null;
  serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "journeyx-service" } },
  });
  return serviceClient;
}
