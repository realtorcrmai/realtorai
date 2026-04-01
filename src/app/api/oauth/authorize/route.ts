import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthorizationCode } from "@/lib/oauth/server";
import { auth } from "@/lib/auth";

/**
 * OAuth2 Authorization Endpoint.
 * Renders consent screen or redirects with authorization code.
 *
 * Query params:
 *   - response_type=code (required)
 *   - client_id (required)
 *   - redirect_uri (required)
 *   - state (required, CSRF protection)
 *   - scope (optional, space-separated)
 *   - code_challenge (PKCE, recommended)
 *   - code_challenge_method=S256 (PKCE)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const scope = searchParams.get("scope");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "S256";

  // Validate required params
  if (responseType !== "code") {
    return NextResponse.json(
      { error: "unsupported_response_type" },
      { status: 400 }
    );
  }

  if (!clientId || !redirectUri || !state) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing client_id, redirect_uri, or state" },
      { status: 400 }
    );
  }

  // Verify client exists
  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .single();

  if (!client) {
    return NextResponse.json(
      { error: "invalid_client", error_description: "Unknown client_id" },
      { status: 400 }
    );
  }

  // Check user is authenticated via NextAuth
  const session = await auth();
  if (!session?.user?.email) {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/login?return_to=${returnUrl}`, request.url)
    );
  }

  // Resolve tenant for this user
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("agent_email", session.user.email)
    .is("removed_at", null)
    .limit(1)
    .single();

  if (!membership) {
    const errorRedirect = new URL(redirectUri);
    errorRedirect.searchParams.set("error", "access_denied");
    errorRedirect.searchParams.set("error_description", "User has no tenant membership");
    errorRedirect.searchParams.set("state", state);
    return NextResponse.redirect(errorRedirect);
  }

  // Auto-approve for now (TODO: render consent screen in Phase 2)
  // In production, show consent page with platform name, permissions, PIPEDA notice
  const scopes = scope ? scope.split(" ") : ["voice:read", "voice:write", "crm:read"];

  const result = await createAuthorizationCode({
    clientId,
    tenantId: membership.tenant_id,
    agentEmail: session.user.email,
    redirectUri,
    scopes,
    state,
    codeChallenge: codeChallenge ?? undefined,
    codeChallengeMethod,
  });

  if (result.error) {
    const errorRedirect = new URL(redirectUri);
    errorRedirect.searchParams.set("error", "server_error");
    errorRedirect.searchParams.set("error_description", result.error);
    errorRedirect.searchParams.set("state", state);
    return NextResponse.redirect(errorRedirect);
  }

  // Log consent for PIPEDA compliance
  await supabase.from("oauth_consent_records").insert({
    tenant_id: membership.tenant_id,
    agent_email: session.user.email,
    client_id: clientId,
    platform: client.platform,
    scopes_granted: scopes,
    consent_text: `Authorized ${client.client_name} (${client.platform}) to access: ${scopes.join(", ")}`,
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
    user_agent: request.headers.get("user-agent"),
  });

  // Redirect with code
  const successRedirect = new URL(redirectUri);
  successRedirect.searchParams.set("code", result.code!);
  successRedirect.searchParams.set("state", state);
  return NextResponse.redirect(successRedirect);
}
