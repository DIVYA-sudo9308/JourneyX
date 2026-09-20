import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const protectedPrefixes = ["/dashboard", "/customers", "/pipeline"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!isProtected && !isAuthPage) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("sb-xmbfocscluhndxyodrwa-auth-token");
  const accessToken0 = request.cookies.get(
    "sb-xmbfocscluhndxyodrwa-auth-token.0",
  );

  let isAuthenticated = false;

  if (accessToken?.value || accessToken0?.value) {
    try {
      let tokenValue = accessToken?.value;

      if (!tokenValue && accessToken0?.value) {
        const chunks: string[] = [];
        let i = 0;
        while (true) {
          const chunk = request.cookies.get(
            `sb-xmbfocscluhndxyodrwa-auth-token.${i}`,
          );
          if (!chunk?.value) break;
          chunks.push(chunk.value);
          i++;
        }
        tokenValue = chunks.join("");
      }

      if (tokenValue) {
        const parsed = JSON.parse(
          tokenValue.startsWith("base64-")
            ? atob(tokenValue.slice(7))
            : tokenValue,
        );
        const token = parsed?.access_token ?? parsed?.[0];

        if (token) {
          const supabase = createClient(url, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data } = await supabase.auth.getUser(token);
          isAuthenticated = !!data?.user;
        }
      }
    } catch {
      isAuthenticated = false;
    }
  }

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/pipeline/:path*",
    "/login",
    "/signup",
  ],
};
