import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes — always allow
  // ── Public routes — no auth required ──────────────────────
  // SECURITY: Every entry here is an intentional auth bypass.
  // Adding a route here means ANYONE on the internet can hit it.
  // Think carefully before adding. See pendingwork.md P0 audit.
  if (
    // Auth pages (must be public for login/signup flow)
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify" ||
    pathname.startsWith("/verify/") ||
    pathname === "/onboarding" ||
    pathname === "/personalize" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/invite/accept") ||

    // Static assets
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/logo-") ||
    pathname === "/logo-animated.html" ||
    pathname === "/white-rock-digital-twin.html" ||
    pathname === "/three.min.js" ||
    pathname === "/OrbitControls.js" ||

    // Auth API (NextAuth handles its own auth)
    pathname.startsWith("/api/auth") ||

    // Health check (uptime monitors, load balancers)
    pathname.startsWith("/api/health") ||

    // Webhooks (verified by signature, not session)
    pathname.startsWith("/api/webhooks") ||

    // Crons (verified by Bearer CRON_SECRET, not session)
    pathname.startsWith("/api/cron") ||

    // Editorial generation worker (CRON_SECRET auth, not session)
    pathname === "/api/editorial/generate" ||

    // Editorial unsubscribe (HMAC-signed token + expiry, not session)
    pathname.startsWith("/api/editorial/unsubscribe") ||

    // Editorial Resend webhook (Svix-signed, not session)
    pathname.startsWith("/api/editorial/webhooks/resend") ||

    // Unsubscribe (HMAC-signed token, not session)
    pathname.startsWith("/api/newsletters/unsubscribe") ||

    // Consent re-confirmation (link from email, rate-limited)
    pathname.startsWith("/api/consent/reconfirm") ||

    // Website SDK endpoints (API-key authenticated, not session)
    pathname.startsWith("/api/websites/") ||

    // Voice agent (own auth via requireVoiceAgentAuth)
    pathname.startsWith("/api/voice-agent") ||

    // Social OAuth callback (external provider redirect)
    pathname.startsWith("/api/social/oauth") ||

    // Address autocomplete (public, rate-limited, no PII)
    pathname.startsWith("/api/address-autocomplete")
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

  // Admin routes — require session at minimum (role check in page/action).
  // Edge middleware cannot decode NextAuth JWT without crypto overhead,
  // so admin role enforcement is done server-side in page components
  // via `auth()` + `session.user.role !== 'admin'` → redirect("/").
  // This block ensures unauthenticated users never reach admin pages.
  if (pathname.startsWith("/admin") && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Onboarding gate moved to dashboard layout (server-side) for reliable
  // DB-fresh checks — middleware JWT can be stale after onboarding completion.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-.*\\.html|logo-.*\\.mp4|logo-.*\\.svg).*)"],
};
