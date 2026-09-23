/**
 * Regression: signup → email confirmation callback → authenticated session →
 * /dashboard.
 *
 * Drives the real `signUp()` (PKCE, cookie storage), the real
 * `GET /auth/confirm` handler and the real `proxy.ts`, with cookies carried
 * between steps as a browser's cookie jar would. Only Supabase Auth itself is
 * replaced — by an in-memory GoTrue that checks what the real one checks: the
 * PKCE verifier against the challenge sent at sign-up, and the bearer token on
 * `/user`. A session that `/dashboard` cannot read fails the final step.
 *
 * `auth-confirm.live.test.ts` runs the token_hash path against the real
 * project when AUTH_E2E_LIVE=1.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test, { afterEach, beforeEach } from "node:test";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, type NextResponse } from "next/server";

import { GET as confirm } from "../app/auth/confirm/route";
import Home from "../app/page";
import { proxy } from "../proxy";

const SUPABASE = "https://testref.supabase.co";
const APP = "https://journey-x.test";
const SESSION_COOKIE = "sb-testref-auth-token";

// ── in-memory Supabase Auth ────────────────────────────────────────────────

type User = { id: string; email: string; password: string; confirmed: boolean };
const auth = {
  users: new Map<string, User>(),
  challenges: new Map<string, { userId: string; challenge: string }>(), // auth code → PKCE challenge
  tokenHashes: new Map<string, string>(), // token_hash → user id
  accessTokens: new Map<string, string>(), // access token → user id
  signups: [] as { redirectTo: string | null; codeChallenge: string | undefined }[],
};

const realFetch = globalThis.fetch;
const realEnv = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
  auth.users.clear();
  auth.challenges.clear();
  auth.tokenHashes.clear();
  auth.accessTokens.clear();
  auth.signups.length = 0;
  globalThis.fetch = gotrue;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL = realEnv.url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = realEnv.key;
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function publicUser(u: User) {
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: u.confirmed ? new Date().toISOString() : null,
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
}

function issueSession(u: User) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const accessToken = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, exp, aud: "authenticated", role: "authenticated", email: u.email, jti: randomUUID() })}.sig`;
  auth.accessTokens.set(accessToken, u.id);
  return { access_token: accessToken, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: randomUUID(), user: publicUser(u) };
}

async function gotrue(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const req = new Request(input, init);
  const url = new URL(req.url);
  if (url.origin !== SUPABASE) throw new Error(`unexpected network call: ${url.origin}`);
  const body = req.method === "POST" ? await req.json() : null;

  switch (`${req.method} ${url.pathname}`) {
    case "POST /auth/v1/signup": {
      const u: User = { id: randomUUID(), email: body.email, password: body.password, confirmed: false };
      auth.users.set(u.id, u);
      auth.signups.push({ redirectTo: url.searchParams.get("redirect_to"), codeChallenge: body.code_challenge });
      return json(200, publicUser(u)); // confirmation required → no session
    }
    case "POST /auth/v1/verify": {
      const userId = auth.tokenHashes.get(body.token_hash);
      const u = userId ? auth.users.get(userId) : undefined;
      if (!u) return json(403, { code: "otp_expired", error_code: "otp_expired", msg: "Email link is invalid or has expired" });
      auth.tokenHashes.delete(body.token_hash);
      u.confirmed = true;
      return json(200, issueSession(u));
    }
    case "POST /auth/v1/token": {
      if (url.searchParams.get("grant_type") === "pkce") {
        const flow = auth.challenges.get(body.auth_code);
        const derived = createHash("sha256").update(body.code_verifier ?? "").digest("base64url");
        if (!flow || flow.challenge !== derived) {
          return json(400, { code: "bad_code_verifier", error_code: "bad_code_verifier", msg: "code challenge does not match previously saved code verifier" });
        }
        auth.challenges.delete(body.auth_code);
        return json(200, issueSession(auth.users.get(flow.userId)!));
      }
      if (url.searchParams.get("grant_type") === "password") {
        const u = [...auth.users.values()].find((x) => x.email === body.email && x.password === body.password);
        if (!u) return json(400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" });
        if (!u.confirmed) return json(400, { code: "email_not_confirmed", error_code: "email_not_confirmed", msg: "Email not confirmed" });
        return json(200, issueSession(u));
      }
      break;
    }
    case "GET /auth/v1/user": {
      const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
      const userId = auth.accessTokens.get(token);
      return userId ? json(200, publicUser(auth.users.get(userId)!)) : json(401, { code: "bad_jwt", msg: "invalid JWT" });
    }
  }
  return json(404, { msg: `no mock for ${req.method} ${url.pathname}` });
}

/** What Supabase's `/auth/v1/verify` does when the default email link is clicked. */
function clickDefaultEmailLink(email: string): string {
  const u = [...auth.users.values()].find((x) => x.email === email)!;
  const signup = auth.signups.at(-1)!;
  u.confirmed = true; // confirmed before the redirect, regardless of what happens next
  const code = randomUUID();
  auth.challenges.set(code, { userId: u.id, challenge: signup.codeChallenge! });
  const target = new URL(signup.redirectTo ?? APP); // no redirect_to → Site URL
  target.searchParams.set("code", code);
  return target.href;
}

// ── a browser ──────────────────────────────────────────────────────────────

class Browser {
  jar = new Map<string, string>();

  get cookieHeader(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  store(response: Response): void {
    for (const c of (response as NextResponse).cookies.getAll()) {
      if (!c.value || c.maxAge === 0) this.jar.delete(c.name);
      else this.jar.set(c.name, c.value);
    }
  }

  request(url: string): NextRequest {
    return new NextRequest(url, { headers: this.cookieHeader ? { cookie: this.cookieHeader } : {} });
  }

  /** `/signup` page: the same PKCE + cookie-storage client `createBrowserClient` builds. */
  async signUp(email: string, password: string): Promise<void> {
    const supabase = createServerClient(SUPABASE, "anon-test-key", {
      cookies: {
        getAll: () => [...this.jar].map(([name, value]) => ({ name, value })),
        setAll: (cs) => cs.forEach(({ name, value, options }) => (!value || options?.maxAge === 0 ? this.jar.delete(name) : this.jar.set(name, value))),
      },
    });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${APP}/auth/confirm?next=%2Fdashboard` },
    });
    assert.equal(error, null);
    assert.equal(data.session, null, "email confirmation is on: signUp returns no session");
  }
}

function location(res: Response): URL {
  const raw = res.headers.get("location");
  assert.ok(raw, `expected a redirect, got ${res.status}`);
  return new URL(raw, APP);
}

async function dashboard(browser: Browser): Promise<Response> {
  return proxy(browser.request(`${APP}/dashboard`));
}

function passesProxy(res: Response): boolean {
  return res.headers.get("x-middleware-next") === "1" && !res.headers.get("location");
}

// ── tests ──────────────────────────────────────────────────────────────────

test("signup → default email link (?code=) → /auth/confirm → session → /dashboard renders", async () => {
  const browser = new Browser();
  await browser.signUp("new@example.test", "hunter22");
  assert.ok([...browser.jar.keys()].some((k) => k.endsWith("-code-verifier")), "signUp leaves the PKCE verifier cookie");
  assert.equal(new URL(auth.signups[0].redirectTo!).pathname, "/auth/confirm", "email links back to /auth/confirm");

  const callback = clickDefaultEmailLink("new@example.test");
  const res = await confirm(browser.request(callback));

  assert.equal(location(res).pathname, "/dashboard");
  browser.store(res);
  assert.ok(browser.jar.has(SESSION_COOKIE), "session cookie set on the redirect response");
  assert.equal(browser.jar.has(`${SESSION_COOKIE}-code-verifier`), false, "verifier consumed");

  const gate = await dashboard(browser);
  assert.ok(passesProxy(gate), `/dashboard must not bounce: ${gate.headers.get("location")}`);
});

test("signup → token_hash email link → /auth/confirm → session → /dashboard renders, on any device", async () => {
  const signupBrowser = new Browser();
  await signupBrowser.signUp("hash@example.test", "hunter22");
  const u = [...auth.users.values()][0];
  auth.tokenHashes.set("th_123", u.id);

  const phone = new Browser(); // no verifier cookie: a different device
  const res = await confirm(phone.request(`${APP}/auth/confirm?token_hash=th_123&type=email&next=/dashboard`));

  assert.equal(location(res).pathname, "/dashboard");
  phone.store(res);
  assert.ok(phone.jar.has(SESSION_COOKIE));
  assert.ok(passesProxy(await dashboard(phone)));
  assert.equal(u.confirmed, true);
});

test("default link opened in another browser: email confirmed, sent to sign in, password works", async () => {
  const desktop = new Browser();
  await desktop.signUp("other@example.test", "hunter22");
  const callback = clickDefaultEmailLink("other@example.test");

  const phone = new Browser();
  const res = await confirm(phone.request(callback));
  const to = location(res);
  assert.equal(to.pathname, "/login");
  assert.equal(to.searchParams.get("notice"), "confirm_elsewhere");
  phone.store(res);
  assert.equal(phone.jar.has(SESSION_COOKIE), false);

  const bounced = await dashboard(phone);
  assert.equal(location(bounced).pathname, "/login");

  // The account is confirmed, so the credentials used at sign-up now work.
  const login = createServerClient(SUPABASE, "anon-test-key", { cookies: { getAll: () => [], setAll: () => {} } });
  const ok = await login.auth.signInWithPassword({ email: "other@example.test", password: "hunter22" });
  assert.equal(ok.error, null);
  const wrong = await login.auth.signInWithPassword({ email: "other@example.test", password: "nope" });
  assert.equal(wrong.error?.code, "invalid_credentials");
});

test("a confirmation code landing on the Site URL root is forwarded to /auth/confirm, not dropped", async () => {
  // Production shipped without /auth/confirm: `/` sent `?code=` straight to
  // /dashboard, which bounced to /login with no session ever created.
  await assert.rejects(
    Home({ searchParams: Promise.resolve({ code: "abc" }), params: Promise.resolve({}) }),
    (err: { digest?: string }) => /\/auth\/confirm\?code=abc/.test(err.digest ?? ""),
  );
  await assert.rejects(
    Home({ searchParams: Promise.resolve({}), params: Promise.resolve({}) }),
    (err: { digest?: string }) => /;\/dashboard;/.test(err.digest ?? ""),
  );
});

test("an expired or reused link never signs anyone in", async () => {
  const browser = new Browser();
  const res = await confirm(browser.request(`${APP}/auth/confirm?token_hash=unknown&type=email`));
  assert.equal(location(res).searchParams.get("notice"), "link_invalid");
  browser.store(res);
  assert.equal(browser.jar.has(SESSION_COOKIE), false);

  const upstream = await confirm(browser.request(`${APP}/auth/confirm?error=access_denied&error_code=otp_expired`));
  assert.equal(location(upstream).searchParams.get("notice"), "link_invalid");
});

test("next is kept on-origin", async () => {
  await new Browser().signUp("next@example.test", "hunter22");
  const u = [...auth.users.values()][0];
  auth.tokenHashes.set("th_next", u.id);
  const res = await confirm(new Browser().request(`${APP}/auth/confirm?token_hash=th_next&type=email&next=https://evil.example/x`));
  assert.equal(location(res).href, `${APP}/dashboard`);
});
