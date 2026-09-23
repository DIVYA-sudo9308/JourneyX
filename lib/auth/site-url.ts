/**
 * The public origin auth emails and OAuth providers send users back to.
 *
 * Supabase uses the `emailRedirectTo` / `redirectTo` we pass, and falls back
 * to the dashboard "Site URL" only when we pass nothing — which is how
 * confirmation links ended up pointing at http://localhost:3000.
 *
 * Resolution order:
 *  1. `NEXT_PUBLIC_SITE_URL` — set on Vercel to the production domain, so every
 *     deployment sends users to the canonical URL.
 *  2. The browser's own origin — local dev (http://localhost:3000) and any
 *     deployment without (1) link back to wherever the user signed up.
 *  3. `NEXT_PUBLIC_VERCEL_URL` — Vercel's per-deployment host, for server code.
 *  4. http://localhost:3000 — local server-side fallback only.
 *
 * Every origin used here must match an entry in Supabase → Authentication →
 * URL Configuration → Redirect URLs, or Supabase ignores it and uses Site URL.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return withoutTrailingSlash(configured);

  if (typeof window !== "undefined") return window.location.origin;

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) return `https://${withoutTrailingSlash(vercel)}`;

  return "http://localhost:3000";
}

/** Absolute URL of the route that completes email confirmation and OAuth. */
export function authConfirmUrl(next = "/dashboard"): string {
  return `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
