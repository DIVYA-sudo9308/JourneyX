import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { fail } from "./http";

/**
 * Route Handlers are public endpoints in their own right, so each one checks
 * the session itself rather than trusting that `proxy.ts` ran first.
 *
 * Returns a 401 response when there is no signed-in user, or null to proceed.
 * Anything that prevents verification — missing Supabase config, an auth
 * server error — counts as signed out, so the check fails closed.
 */
export async function requireUser(): Promise<Response | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return unauthenticated();

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    });
    // `getUser()` revalidates the token with the auth server; a forged or
    // expired cookie does not pass.
    const { data } = await supabase.auth.getUser();
    return data.user ? null : unauthenticated();
  } catch {
    return unauthenticated();
  }
}

export function unauthenticated(): Response {
  return fail(401, "unauthenticated", "Sign in to access this endpoint.");
}
