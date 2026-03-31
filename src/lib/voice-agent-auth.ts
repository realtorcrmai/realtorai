import { NextResponse } from "next/server";
import { resolveTenantFromRequest, DEFAULT_TENANT_ID } from "@/lib/tenant-context";

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
 * Require Bearer token authentication for voice agent API routes.
 * Resolves tenant context from the token and returns tenant_id.
 *
 * Supports:
 *   - Legacy VOICE_AGENT_API_KEY (single shared key, maps to default tenant)
 *   - Per-tenant API keys (looked up in tenant_api_keys table)
 *   - OAuth2 JWT tokens with tenant_id claim (future)
 */
export async function requireVoiceAgentAuth(
  request: Request
): Promise<VoiceAuthResult | VoiceAuthError> {
  const key = process.env.VOICE_AGENT_API_KEY;
  if (!key) {
    return {
      authorized: false as const,
      error: NextResponse.json(
        { error: "Voice agent API not configured — set VOICE_AGENT_API_KEY" },
        { status: 503 }
      ),
    };
  }

  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return {
      authorized: false as const,
      error: NextResponse.json(
        { error: "Unauthorized — missing Bearer token" },
        { status: 401 }
      ),
    };
  }

  // Resolve tenant from the token
  const resolved = await resolveTenantFromRequest(request);
  if (resolved.error && !resolved.tenantId) {
    return {
      authorized: false as const,
      error: NextResponse.json(
        { error: resolved.error },
        { status: 401 }
      ),
    };
  }

  // Legacy check: match against VOICE_AGENT_API_KEY
  const token = auth.slice(7);
  if (token !== key) {
    // TODO: Check per-tenant API keys in tenant_api_keys table (Step 5)
    return {
      authorized: false as const,
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true as const,
    error: null,
    tenantId: resolved.tenantId ?? DEFAULT_TENANT_ID,
    agentEmail: resolved.agentEmail,
  };
}
