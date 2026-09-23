"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client.
 *
 * Uses `createBrowserClient` (not the plain `createClient`) because the
 * session has to live in a **cookie**: `proxy.ts` runs before the request
 * reaches the app and can only read cookies, never `localStorage`. A plain
 * client persists to `localStorage` only, so every protected navigation would
 * look unauthenticated and bounce back to /login. The adapter also chunks
 * oversized sessions and rewrites the cookie on token refresh.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  browserClient = createBrowserClient(url, anonKey);

  return browserClient;
}
