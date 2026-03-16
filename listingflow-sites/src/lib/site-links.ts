import { headers } from "next/headers";

/**
 * Get the base path for public site links.
 * - On localhost (no subdomain): returns "/site" so links work at /site/*
 * - On subdomain/custom domain: returns "" so links work at /*
 */
export async function getSiteBasePath(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const hostname = host.replace(/:\d+$/, "");

  // If accessed via subdomain or custom domain, middleware rewrites / → /site
  // so links should be bare: /listings, /about, etc.
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "/site";
  }

  return "";
}
