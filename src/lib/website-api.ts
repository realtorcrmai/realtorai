import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validate website API key from X-LF-Key header.
 *
 * Authentication hierarchy:
 * 1. CRON_SECRET — admin/system access (for internal tooling)
 * 2. realtor_sites.api_key — per-site key set in the Realtors360 Sites
 *    admin panel when the realtor connects their website. Lookup returns
 *    the site's realtor_id for downstream tenant scoping.
 * 3. tenant_api_keys — future per-tenant key with hash verification,
 *    permissions, rate limits, and expiry. Not implemented yet but the
 *    table exists (migration 072).
 *
 * History:
 * - Before 2026-04-09, this function accepted ANY string starting with
 *   "lf_" as valid — a critical auth bypass. The comment read "will
 *   validate against DB in Sprint 2." This was surfaced during the
 *   production readiness audit and fixed.
 *
 * Security model:
 * - Website endpoints use `createAdminClient()` (not tenant client)
 *   because the website caller is external and doesn't have a user
 *   session. The API key identifies WHICH realtor's data to access.
 *   Callers MUST use the returned `realtorId` to scope all queries.
 * - If the key is invalid, the endpoint returns 401. Period.
 */
export async function validateApiKey(
  request: NextRequest
): Promise<
  | { valid: true; realtorId: string | null }
  | { valid: false; error: NextResponse }
> {
  const apiKey = request.headers.get("x-lf-key");

  if (!apiKey) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: "API key required", code: "MISSING_KEY" },
        { status: 401, headers: corsHeaders(request) }
      ),
    };
  }

  // 1. System key — matches CRON_SECRET exactly
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret.length > 0 && apiKey === cronSecret) {
    return { valid: true, realtorId: null }; // System-level, no tenant scoping
  }

  // 2. Per-site key — lookup against realtor_sites.api_key
  //    This is the primary auth path for website integrations.
  try {
    const supabase = createAdminClient();
    const { data: site } = await supabase
      .from("realtor_sites")
      .select("realtor_id, api_key")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (site?.realtor_id) {
      return { valid: true, realtorId: site.realtor_id };
    }
  } catch {
    // DB lookup failed — fall through to rejection.
    // Don't leak the error to the caller.
  }

  // 3. No match — reject.
  return {
    valid: false,
    error: NextResponse.json(
      { error: "Invalid API key", code: "INVALID_KEY" },
      { status: 401, headers: corsHeaders(request) }
    ),
  };
}

/**
 * CORS headers for cross-origin website requests.
 *
 * Reflects the request's Origin header back as the allowed origin.
 * This is acceptable because the API key is the security boundary —
 * a valid key is required regardless of the origin. The alternative
 * (maintaining a per-realtor allowlist of website domains) is tracked
 * as a future enhancement but the key validation is the primary gate.
 *
 * When no Origin header is present (server-to-server calls), returns
 * no ACAO header at all (the browser never sends Origin for non-CORS
 * requests, so this is a no-op for legitimate server calls).
 */
export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin) {
    return {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-LF-Key",
      "Access-Control-Max-Age": "86400",
    };
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-LF-Key",
    "Access-Control-Max-Age": "86400",
    // Vary on Origin so CDNs don't cache a response for origin A
    // and serve it to origin B.
    Vary: "Origin",
  };
}

/**
 * Handle CORS preflight OPTIONS requests.
 */
export function handleCORS(request: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * Normalize phone number to +1XXXXXXXXXX format.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

/**
 * Get Supabase admin client (convenience re-export).
 */
export { createAdminClient };
