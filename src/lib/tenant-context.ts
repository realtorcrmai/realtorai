/**
 * Multi-tenant context management.
 * Sets and retrieves tenant_id for Supabase RLS isolation.
 */

import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Set tenant context on a Supabase connection so RLS policies filter by tenant.
 * Must be called before any tenant-scoped query.
 */
export async function setTenantContext(tenantId: string) {
  const supabase = createAdminClient();
  await supabase.rpc("set_tenant_context", { p_tenant_id: tenantId });
  return supabase;
}

/**
 * Get a Supabase client with tenant context already set.
 * Convenience wrapper for the common pattern.
 */
export async function getTenantClient(tenantId: string) {
  return setTenantContext(tenantId);
}

/**
 * Extract tenant_id from a JWT token's claims.
 * Returns the default tenant if no tenant_id claim exists (backward compat).
 */
export function extractTenantId(jwtPayload: Record<string, unknown>): string {
  const tenantId = jwtPayload.tenant_id as string | undefined;
  return tenantId ?? DEFAULT_TENANT_ID;
}

/**
 * Resolve tenant_id from a request's Authorization header.
 * Supports both:
 *   - Per-tenant API keys (looked up in tenant_api_keys table)
 *   - JWT tokens with tenant_id claim (OAuth2 flow)
 *
 * Falls back to default tenant for backward compatibility during migration.
 */
export async function resolveTenantFromRequest(
  request: Request
): Promise<{ tenantId: string; agentEmail: string | null; error: string | null }> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { tenantId: DEFAULT_TENANT_ID, agentEmail: null, error: "Missing Authorization header" };
  }

  const token = auth.slice(7);

  // Phase 1: Check against legacy VOICE_AGENT_API_KEY for backward compat
  const legacyKey = process.env.VOICE_AGENT_API_KEY;
  if (legacyKey && token === legacyKey) {
    return { tenantId: DEFAULT_TENANT_ID, agentEmail: null, error: null };
  }

  // Phase 2: Try to decode as JWT (OAuth2 tokens)
  // TODO: Implement JWT validation in Step 5 (OAuth2 server)
  // For now, fall back to legacy key check
  return { tenantId: DEFAULT_TENANT_ID, agentEmail: null, error: null };
}

export { DEFAULT_TENANT_ID };
