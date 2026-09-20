import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  supabaseAnonKey,
  supabaseServiceKey,
  supabaseUrl,
} from "@/lib/supabase/env";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/**
 * Read-only server client using the anon key. Safe for Server Components /
 * queries. RLS applies (anon has SELECT on our public.* tables).
 */
export function getServerSupabase(): SupabaseClient | null {
  if (anonClient) return anonClient;
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;
  anonClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "journeyx-server" } },
  });
  return anonClient;
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
