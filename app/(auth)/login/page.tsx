"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { getBrowserSupabase } from "@/lib/supabase/client";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

/**
 * Where to land after signing in. `proxy.ts` appends `?next=<path>` when it
 * bounces an unauthenticated request, so returning the user to the page they
 * asked for is just a matter of reading it back.
 *
 * The value is resolved with the browser's own URL parser and kept only when
 * it stays on this origin. Prefix checks are not enough: under the WHATWG
 * parser `/\evil.example` resolves to `http://evil.example`, so a
 * `startsWith("//")` test alone still leaves an open redirect. Resolving the
 * URL uses the same parser an attacker would rely on, so anything that would
 * leave the origin — protocol-relative, backslash-prefixed, absolute, or a
 * `javascript:` URI — is rejected.
 */
function redirectTarget(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next) return "/dashboard";
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Unparseable `next` — fall through to the default.
  }
  return "/dashboard";
}

/**
 * Fixed messages for `?notice=` set by `/auth/confirm`. Only known codes are
 * shown, so the query string cannot put arbitrary text on the sign-in page.
 */
const NOTICES: Record<string, string> = {
  confirm_elsewhere:
    "Your email is confirmed. Sign in to continue.",
  link_invalid:
    "That link is invalid or has expired. Sign in, or sign up again to get a new confirmation email.",
};

/**
 * Supabase answers an unconfirmed account with `email_not_confirmed`, never
 * with `invalid_credentials` — that one always means the email/password pair
 * does not match. Saying which keeps the two failures from looking alike.
 */
const SIGN_IN_ERRORS: Record<string, string> = {
  email_not_confirmed:
    "Confirm your email first — open the link we sent you, then sign in.",
  invalid_credentials:
    "Email or password is incorrect. Check that your browser didn't autofill a different saved password.",
};

function AuthNotice() {
  const notice = NOTICES[useSearchParams().get("notice") ?? ""];
  if (!notice) return null;
  return (
    <div
      role="status"
      className="rounded-sm border border-border bg-surface-alt px-3 py-2 text-sm text-foreground"
    >
      {notice}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(SIGN_IN_ERRORS[authError.code ?? ""] ?? authError.message);
        return;
      }

      router.push(redirectTarget());
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3">
        <BrandMark className="h-12 w-12" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Sign in to JourneyX
        </h1>
        <p className="text-sm text-text-secondary">
          See the journey behind every interaction.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Suspense fallback={null}>
          <AuthNotice />
        </Suspense>

        {error && (
          <div className="rounded-sm border border-danger-tint bg-danger-tint/40 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-9 w-full rounded-sm border border-border bg-surface px-3 pr-9 text-sm text-foreground placeholder:text-text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={loading}
          className="mt-2 w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-accent hover:text-accent-hover"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
