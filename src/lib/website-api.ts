import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validate website API key from X-LF-Key header.
 * For now uses CRON_SECRET as a universal key (single-tenant).
 * Sprint 2 will add per-realtor API keys stored in realtor_sites.api_key.
 */
export function validateApiKey(request: NextRequest): { valid: boolean; error?: NextResponse } {
  const apiKey = request.headers.get("x-lf-key");
  const cronSecret = process.env.CRON_SECRET;

  if (!apiKey) {
    return {
      valid: false,
      error: NextResponse.json(
        { error: "API key required", code: "MISSING_KEY" },
        { status: 401, headers: corsHeaders(request) }
      ),
    };
  }

  // Single-tenant: accept CRON_SECRET or any key starting with "lf_"
  if (cronSecret && apiKey === cronSecret) {
    return { valid: true };
  }

  // Accept any lf_ prefixed key for now (will validate against DB in Sprint 2)
  if (apiKey.startsWith("lf_")) {
    return { valid: true };
  }

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
 */
export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-LF-Key",
    "Access-Control-Max-Age": "86400",
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
