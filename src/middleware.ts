import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes — always allow
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/verify" ||
    pathname.startsWith("/verify/") ||
    pathname === "/onboarding" ||
    pathname === "/personalize" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/sdk/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo-") ||
    pathname === "/logo-animated.html" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/newsletters/unsubscribe") ||
    pathname.startsWith("/api/newsletters/process") ||
    pathname.startsWith("/api/voice-agent") ||
    pathname.startsWith("/api/feedback") ||
    pathname.startsWith("/api/contacts/log-interaction") ||
    pathname.startsWith("/api/contacts/context") ||
    pathname.startsWith("/api/contacts/instructions") ||
    pathname.startsWith("/api/contacts/watchlist") ||
    pathname.startsWith("/api/contacts/journey") ||
    pathname.startsWith("/api/newsletters/edit") ||
    pathname.startsWith("/api/newsletters/preview") ||
    pathname.startsWith("/api/listings/blast") ||
    pathname.startsWith("/api/templates/preview") ||
    pathname.startsWith("/api/contacts/export") ||
    pathname.startsWith("/api/contacts/import") ||
    pathname.startsWith("/api/websites/") ||
    pathname.startsWith("/api/social/oauth") ||
    pathname.startsWith("/api/agent/") ||
    pathname.startsWith("/api/contacts/import-gmail") ||
    pathname.startsWith("/api/contacts/import-vcard")
  ) {
    return NextResponse.next();
  }

  // Check for auth session cookie
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // API routes without session → 401
  if (pathname.startsWith("/api") && !sessionToken) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Dashboard pages without session → redirect to login
  // (Dashboard layout also checks server-side as backup)
  if (!sessionToken && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Onboarding gate moved to dashboard layout (server-side) for reliable
  // DB-fresh checks — middleware JWT can be stale after onboarding completion.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-.*\\.html|logo-.*\\.mp4|logo-.*\\.svg).*)"],
};
