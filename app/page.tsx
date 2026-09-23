import { redirect } from "next/navigation";

const AUTH_PARAMS = ["code", "token_hash", "error", "error_description"];

/**
 * Root redirects to the Dashboard (SoT §4.2 / APP_FLOW §1.4).
 *
 * Supabase lands here with `?code=` or `?error=` whenever it falls back to the
 * Site URL (a redirect URL not on its allow-list). Those are forwarded to
 * `/auth/confirm` instead of being dropped by the dashboard redirect.
 */
export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  if (AUTH_PARAMS.some((key) => params[key] !== undefined)) {
    const forward = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") forward.set(key, value);
    }
    redirect(`/auth/confirm?${forward.toString()}`);
  }
  redirect("/dashboard");
}
