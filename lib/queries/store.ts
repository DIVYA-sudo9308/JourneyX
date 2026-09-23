import "server-only";

import { SupabaseStore } from "@/lib/pipeline/adapters/supabase";
import { getServerSupabase } from "@/lib/supabase/server";

import { QueryError } from "./shared";

const MISSING_CONFIG =
  "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env.local.";

/** The Supabase client used by every server-side read. Never reaches the browser. */
export function client() {
  const supabase = getServerSupabase();
  if (!supabase) throw new QueryError(MISSING_CONFIG);
  return supabase;
}

/**
 * The pipeline's persistence port, backed by Supabase. Route handlers pass
 * this to `processEvent`; writes need the service-role key, so a missing key
 * is reported as configuration error rather than a silent no-op.
 */
export function pipelineStore(): SupabaseStore {
  return new SupabaseStore(client());
}
