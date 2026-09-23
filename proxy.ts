import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedPrefixes = ["/dashboard", "/customers", "/pipeline"];

/** Liveness probe: public so uptime checks work without a session. */
const PUBLIC_API = new Set(["/api/v1/health"]);
/**
 * Machine ingestion: authorized by `x-ingest-token` inside the route handler,
 * since producers and the replay script have no browser session.
 */
const INGEST_API = new Set(["/api/v1/events", "/api/v1/events/batch"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApi = pathname.startsWith("/api/v1/");
  if (
    isApi &&
    (PUBLIC_API.has(pathname) ||
      (request.method === "POST" && INGEST_API.has(pathname)))
  ) {
    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!isApi && !isProtected && !isAuthPage) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Without auth config no session can be verified: the API fails closed.
    return isApi ? unauthenticatedApi() : NextResponse.next();
  }

  // Carries refreshed auth cookies back to the browser. Reassigned by
  // `setAll` when Supabase rotates the access token mid-request.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // `getUser()` revalidates the token against the auth server, so a forged or
  // expired cookie cannot pass. Any failure is treated as signed out, which
  // fails closed on protected routes.
  let isAuthenticated = false;
  try {
    const { data } = await supabase.auth.getUser();
    isAuthenticated = Boolean(data.user);
  } catch {
    isAuthenticated = false;
  }

  if (isApi) {
    return isAuthenticated ? response : unauthenticatedApi();
  }

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

/** API callers get the JSON error envelope, not a redirect to /login. */
function unauthenticatedApi() {
  return NextResponse.json(
    { error: { code: "unauthenticated", message: "Sign in to access this endpoint." } },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/pipeline/:path*",
    "/api/v1/:path*",
    "/login",
    "/signup",
  ],
};
