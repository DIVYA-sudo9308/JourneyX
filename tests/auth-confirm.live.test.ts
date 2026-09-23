/**
 * Live regression against the real Supabase project:
 * signup → confirmation callback → authenticated session → /dashboard.
 *
 * Opt-in (creates and deletes a throwaway user; sends no email):
 *   AUTH_E2E_LIVE=1 node --import tsx --test tests/auth-confirm.live.test.ts
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY (read from .env.local).
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, type NextResponse } from "next/server";

import { GET as confirm } from "../app/auth/confirm/route";
import { proxy } from "../proxy";

config({ path: ".env.local", quiet: true });

const live = process.env.AUTH_E2E_LIVE === "1" && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const APP = "https://journey-x-three.vercel.app";

test("live: token_hash confirmation creates a session that /dashboard accepts", { skip: !live && "set AUTH_E2E_LIVE=1" }, async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `jx-e2e-${Date.now()}@example.com`;
  const password = randomBytes(12).toString("base64url");

  // Sign-up: same user row signUp() creates, without sending the email.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo: `${APP}/auth/confirm?next=%2Fdashboard` },
  });
  assert.equal(error, null);
  const userId = data.user!.id;
  try {
    assert.equal(data.user!.email_confirmed_at ?? null, null, "starts unconfirmed");
    // Supabase keeps redirect_to only when it is on the Redirect URLs allow-list.
    assert.equal(
      new URL(data.properties!.action_link).searchParams.get("redirect_to"),
      `${APP}/auth/confirm?next=%2Fdashboard`,
      "/auth/confirm must be allow-listed in Supabase → Authentication → URL Configuration",
    );

    // Click: the token_hash template link.
    const res = (await confirm(
      new NextRequest(`${APP}/auth/confirm?token_hash=${data.properties!.hashed_token}&type=email&next=%2Fdashboard`),
    )) as NextResponse;
    assert.equal(new URL(res.headers.get("location")!).pathname, "/dashboard");
    const cookies = res.cookies.getAll().filter((c) => c.value);
    assert.ok(cookies.some((c) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(c.name)), "session cookie issued");

    // Next request: /dashboard through the proxy with the browser's cookies.
    const gate = await proxy(
      new NextRequest(`${APP}/dashboard`, { headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") } }),
    );
    assert.equal(gate.headers.get("location"), null, "/dashboard must not redirect to /login");
    assert.equal(gate.headers.get("x-middleware-next"), "1");

    const after = await admin.auth.admin.getUserById(userId);
    assert.ok(after.data.user?.email_confirmed_at, "auth.users row confirmed");

    // And the sign-up credentials sign in.
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const login = await anon.auth.signInWithPassword({ email, password });
    assert.equal(login.error, null);
  } finally {
    await admin.auth.admin.deleteUser(userId);
  }
});
