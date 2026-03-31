import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { createHash, randomBytes } from "crypto";

/**
 * Tenant API Key Management.
 * GET: list keys (prefix only, never full key)
 * POST: create new key (returns plaintext ONCE)
 * DELETE: revoke key (soft delete for audit)
 */
export async function GET(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenant_api_keys")
    .select("id, key_prefix, name, permissions, rate_limit_per_minute, last_used_at, expires_at, created_by, created_at")
    .eq("tenant_id", auth.tenantId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: data });
}

export async function POST(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const { name, permissions, rate_limit_per_minute, expires_at } = body;

  // Generate API key: ra_voice_{random}
  const rawKey = `ra_voice_${randomBytes(24).toString("base64url")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 16);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenant_api_keys")
    .insert({
      tenant_id: auth.tenantId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: name ?? "Default",
      permissions: permissions ?? ["voice:read", "voice:write"],
      rate_limit_per_minute: rate_limit_per_minute ?? 60,
      expires_at: expires_at ?? null,
      created_by: auth.agentEmail ?? "system",
    })
    .select("id, key_prefix, name, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log to audit
  await supabase.from("tenant_audit_log").insert({
    tenant_id: auth.tenantId,
    actor_email: auth.agentEmail ?? "system",
    action: "key_created",
    resource_type: "api_key",
    resource_id: data?.id,
    metadata: { key_prefix: keyPrefix, name: name ?? "Default" },
  });

  // Return plaintext key ONCE — it's never stored
  return NextResponse.json({
    key: rawKey,
    id: data?.id,
    prefix: keyPrefix,
    name: data?.name,
    warning: "Save this key now. It will not be shown again.",
  }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("key_id");

  if (!keyId) {
    return NextResponse.json({ error: "key_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tenant_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("tenant_id", auth.tenantId)
    .is("revoked_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log to audit
  await supabase.from("tenant_audit_log").insert({
    tenant_id: auth.tenantId,
    actor_email: auth.agentEmail ?? "system",
    action: "key_revoked",
    resource_type: "api_key",
    resource_id: keyId,
  });

  return NextResponse.json({ revoked: true });
}
