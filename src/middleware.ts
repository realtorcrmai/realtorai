import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname === "/login";
  const isApiRoute = req.nextUrl.pathname.startsWith("/api");

  if (isApiRoute) {
    return NextResponse.next();
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
