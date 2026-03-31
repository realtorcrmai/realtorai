import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isOnLogin = pathname === "/login";

  // Public pages — no auth required
  if (pathname.startsWith("/docs")) {
    return NextResponse.next();
  }

  // Allow routes that handle their own auth
  if (
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
    pathname.startsWith("/sdk/")
  ) {
    return NextResponse.next();
  }

  // Protect all other API routes
  if (pathname.startsWith("/api") && !isLoggedIn) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Block non-admins from /admin routes
  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (!isOnLogin && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
