/**
 * Supabase environment accessors. Kept in one place so the query layer can
 * probe `hasSupabase()` and cleanly fall back to the mock fixture when the
 * project has not been configured yet.
 */

export function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseAnonKey(): string | undefined {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY
  );
}

export function supabaseServiceKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SECRET_KEY
  );
}

/** True when the server can read Supabase (either service or anon key). */
export function hasSupabase(): boolean {
  return Boolean(supabaseUrl() && (supabaseAnonKey() || supabaseServiceKey()));
}
