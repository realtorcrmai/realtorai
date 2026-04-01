import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const host = hostname.replace(/:\d+$/, ""); // strip port
  const pathname = request.nextUrl.pathname;

  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "listingflow.com";

  // Local dev: localhost goes to admin panel — no rewrite needed
  if (host === "localhost" || host === "127.0.0.1") {
    return NextResponse.next();
  }

  // Check if this is a subdomain request: agent.listingflow.com
  let slug: string | null = null;
  if (host.endsWith(`.${platformDomain}`)) {
    slug = host.replace(`.${platformDomain}`, "");
  }

  // If it's a subdomain, rewrite to /site/* and set headers
  if (slug && slug !== "www" && slug !== "app" && slug !== "sites") {
    const url = request.nextUrl.clone();
    url.pathname = `/site${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-site-slug", slug);
    response.headers.set("x-site-host", host);
    return response;
  }

  // Custom domain: rewrite to /site/* and pass full hostname as lookup key
  if (!host.includes(platformDomain) && host !== "localhost") {
    const url = request.nextUrl.clone();
    url.pathname = `/site${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-site-slug", host);
    response.headers.set("x-site-host", host);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
