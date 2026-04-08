import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes — always allow
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/verify" ||
    pathname.startsWith("/verify/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/sdk/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth") ||
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

  // ── Verification gate — check JWT claims without DB hit ──
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token) {
      if (token.emailVerified === false) {
        if (!pathname.startsWith("/api")) return NextResponse.redirect(new URL("/verify", request.url));
        return NextResponse.json({ error: "Email not verified" }, { status: 403 });
      }
      if (token.phoneVerified === false && token.emailVerified === true) {
        if (!pathname.startsWith("/api")) return NextResponse.redirect(new URL("/verify/phone", request.url));
        return NextResponse.json({ error: "Phone not verified" }, { status: 403 });
      }
    }
  } catch { /* JWT decode failure — allow through, session check already passed */ }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
