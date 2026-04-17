import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantFromRequest, DEFAULT_TENANT_ID } from "@/lib/tenant-context";
import { auth } from "@/lib/auth";

export interface VoiceAuthResult {
  authorized: true;
  error: null;
  tenantId: string;
  agentEmail: string | null;
}

export interface VoiceAuthError {
  authorized: false;
  error: NextResponse;
  tenantId?: undefined;
  agentEmail?: undefined;
}

/**
 * Hash an API key for secure comparison against stored hashes.
 */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Require Bearer token authentication for voice agent API routes.
 * Resolves tenant context from the token and returns tenant_id.
 *
 * Auth flow (checked in order):
 *   1. Per-tenant API key (looked up by hash in tenant_api_keys table)
 *   2. Legacy VOICE_AGENT_API_KEY (single shared key, maps to default tenant)
 */
export async function requireVoiceAgentAuth(
  request: Request
): Promise<VoiceAuthResult | VoiceAuthError> {
  // 0. Check NextAuth session first — browser clients use cookie auth, no key needed
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        authorized: true as const,
        error: null,
        tenantId: session.user.id,
        agentEmail: session.user.email ?? null,
      };
    }
  } catch {
    // auth() unavailable in this context — fall through to Bearer token check
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      authorized: false as const,
      error: NextResponse.json(
        { error: "Unauthorized — missing session or Bearer token" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);

  // 1. Check per-tenant API keys first
  const tenantAuth = await checkTenantApiKey(token);
  if (tenantAuth) {
    return tenantAuth;
  }

  // 2. Fallback: legacy shared key
  const legacyKey = process.env.VOICE_AGENT_API_KEY;
  if (legacyKey && token === legacyKey) {
    const resolved = await resolveTenantFromRequest(request);
    return {
      authorized: true as const,
      error: null,
      tenantId: resolved.tenantId ?? DEFAULT_TENANT_ID,
      agentEmail: resolved.agentEmail,
    };
  }

  return {
    authorized: false as const,
    error: NextResponse.json(
      { error: "Unauthorized — invalid API key" },
      { status: 401 }
    ),
  };
}

/**
 * Look up a per-tenant API key by hash.
 * Returns auth result if found + active, null otherwise.
 */
async function checkTenantApiKey(
  token: string
): Promise<VoiceAuthResult | null> {
  try {
    const db = createAdminClient();
    const keyHash = hashKey(token);

    const { data } = await db
      .from("tenant_api_keys")
      .select("realtor_id, is_active, expires_at, scopes")
      .eq("key_hash", keyHash)
      .single();

    if (!data) return null;
    if (!data.is_active) return null;
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
    if (!data.scopes?.includes("voice-agent")) return null;

    // Update last_used_at (fire-and-forget)
    db.from("tenant_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", keyHash)
      .then(() => {});

    return {
      authorized: true as const,
      error: null,
      tenantId: data.realtor_id,
      agentEmail: null,
    };
  } catch {
    return null;
  }
}
