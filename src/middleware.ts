import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db/database.types";
import { ACCESS_COOKIE_NAME, getConfiguredAccessCode, sha256Hex } from "@/lib/accessCode";

const SUPABASE_PROTECTED_PREFIXES = ["/trips"];
/**
 * The no-login trip companion — real personal data (confirmations, phone
 * numbers, flight details) with no account behind it, gated by a shared
 * 6-digit code instead (see src/lib/accessCode.ts).
 */
const ACCESS_CODE_PROTECTED_PREFIXES = ["/my-trip", "/api/mytrip-weather", "/api/image-search", "/api/flight-status"];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (matchesPrefix(pathname, ACCESS_CODE_PROTECTED_PREFIXES)) {
    const configuredCode = getConfiguredAccessCode();
    let unlocked = false;
    // Fails closed: an unset MYTRIP_ACCESS_CODE blocks access rather than
    // silently leaving /my-trip open.
    if (configuredCode) {
      const expectedHash = await sha256Hex(configuredCode);
      unlocked = request.cookies.get(ACCESS_COOKIE_NAME)?.value === expectedHash;
    }
    if (!unlocked) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Access code required." }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/access-code";
      url.search = "";
      url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase not configured yet (Phase 2 setup pending) — let requests
  // through unauthenticated rather than hard-failing every page.
  if (!supabaseUrl || !anonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (matchesPrefix(pathname, SUPABASE_PROTECTED_PREFIXES) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.json).*)"],
};
