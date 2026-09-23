import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PendingCookie = { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] };

const OTP_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

/**
 * `GET /auth/confirm` — where Supabase sends users back after they click an
 * auth email link (and after an OAuth provider, if one is enabled).
 *
 * Two shapes arrive here:
 *  - `?token_hash=&type=` — from an email template that links here directly
 *    (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`).
 *    Verified server-side, so it signs the user in on any device or browser.
 *  - `?code=` — the default `{{ .ConfirmationURL }}` email link under the PKCE
 *    flow. Supabase has already confirmed the email before redirecting; the
 *    code is exchanged for a session using the verifier cookie that
 *    `signUp()` left in the browser. Opened anywhere else (another device, a
 *    mail app's in-app browser) that cookie is absent and no session can be
 *    created — the user is sent to sign in, and their password works.
 *
 * On success the session cookies ride on the redirect, so the very next
 * request (`/dashboard`) carries them through `proxy.ts`.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"), origin);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = rawType && OTP_TYPES.has(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;
  const flow = tokenHash ? "token_hash" : code ? "code" : "none";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase reports a failed or expired verification by redirecting here
  // with `error` / `error_description` instead of a code.
  const upstreamError = searchParams.get("error_code") ?? searchParams.get("error");
  if (upstreamError || !url || !anonKey || (!code && !(tokenHash && type))) {
    log({ flow, outcome: "rejected", reason: upstreamError ?? (!url || !anonKey ? "missing_env" : "missing_params") });
    return toLogin(origin, next, "link_invalid");
  }

  const pending: PendingCookie[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        pending.push(...cookiesToSet);
      },
    },
  });

  let signedIn = false;
  let reason: string | undefined;
  try {
    const { data, error } =
      tokenHash && type
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : await supabase.auth.exchangeCodeForSession(code!);
    signedIn = !error && Boolean(data.session);
    reason = error ? (error.code ?? error.name) : data.session ? undefined : "no_session";
  } catch (err) {
    reason = err instanceof Error ? err.name : "exception";
  }

  const response = signedIn
    ? NextResponse.redirect(new URL(next, origin))
    : toLogin(origin, next, flow === "token_hash" ? "link_invalid" : "confirm_elsewhere");
  // Session cookies go on the response actually returned.
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options);
  }
  log({
    flow,
    outcome: signedIn ? "session" : "no_session",
    reason,
    // Names only — never cookie values.
    cookies: pending.filter((c) => c.value).map((c) => c.name),
    hadVerifier: request.cookies.getAll().some((c) => c.name.endsWith("-code-verifier")),
    location: new URL(response.headers.get("location") ?? "/", origin).pathname,
  });
  return response;
}

/** One structured line per confirmation, visible in Vercel's function logs. */
function log(fields: Record<string, unknown>): void {
  console.info(`[auth/confirm] ${JSON.stringify(fields)}`);
}

function toLogin(origin: string, next: string, notice: string): NextResponse {
  const login = new URL("/login", origin);
  login.searchParams.set("notice", notice);
  if (next !== "/dashboard") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

/** Same-origin paths only — never an open redirect. */
function safeNext(raw: string | null, origin: string): string {
  if (!raw) return "/dashboard";
  try {
    const target = new URL(raw, origin);
    if (target.origin === origin) return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    // Unparseable — fall through to the default.
  }
  return "/dashboard";
}
