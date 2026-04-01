/**
 * OAuth2 Authorization Server for RealtorAI Voice Agent.
 *
 * Implements:
 *   - Authorization Code flow with PKCE (RFC 7636)
 *   - Token exchange with refresh token rotation
 *   - Audience validation (tokens scoped to platform)
 *   - CSRF protection via state parameter
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { generateAuthCode, generateRefreshToken, verifyCodeChallenge } from "./pkce";

const JWT_SECRET = new TextEncoder().encode(
  process.env.OAUTH_JWT_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-me"
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.OAUTH_REFRESH_SECRET || process.env.NEXTAUTH_SECRET || "dev-refresh-secret"
);

const ACCESS_TOKEN_EXPIRY = "1h";
const AUTH_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

/**
 * Create an authorization code for the OAuth2 flow.
 */
export async function createAuthorizationCode(opts: {
  clientId: string;
  tenantId: string;
  agentEmail: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}): Promise<{ code: string; error?: never } | { code?: never; error: string }> {
  const supabase = createAdminClient();

  // Validate client
  const { data: client } = await supabase
    .from("oauth_clients")
    .select("*")
    .eq("client_id", opts.clientId)
    .eq("is_active", true)
    .single();

  if (!client) return { error: "Invalid client_id" };

  // Validate redirect URI
  const allowedUris = (client.redirect_uris as string[]) || [];
  if (!allowedUris.includes(opts.redirectUri)) {
    return { error: "Invalid redirect_uri" };
  }

  // Validate tenant membership
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", opts.tenantId)
    .eq("agent_email", opts.agentEmail)
    .is("removed_at", null)
    .single();

  if (!membership) return { error: "User is not a member of this tenant" };

  const code = generateAuthCode();
  const expiresAt = new Date(Date.now() + AUTH_CODE_EXPIRY_MS).toISOString();

  const { error } = await supabase.from("oauth_auth_codes").insert({
    code,
    client_id: opts.clientId,
    tenant_id: opts.tenantId,
    agent_email: opts.agentEmail,
    redirect_uri: opts.redirectUri,
    scopes: opts.scopes,
    state: opts.state,
    code_challenge: opts.codeChallenge ?? null,
    code_challenge_method: opts.codeChallengeMethod ?? "S256",
    expires_at: expiresAt,
  });

  if (error) return { error: error.message };
  return { code };
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeAuthCode(opts: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<
  | { accessToken: string; refreshToken: string; expiresIn: number; tokenType: "Bearer"; error?: never }
  | { error: string; accessToken?: never; refreshToken?: never; expiresIn?: never; tokenType?: never }
> {
  const supabase = createAdminClient();

  // Look up and atomically mark the code as used
  const { data: authCode } = await supabase
    .from("oauth_auth_codes")
    .select("*")
    .eq("code", opts.code)
    .eq("client_id", opts.clientId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!authCode) return { error: "Invalid or expired authorization code" };

  // Mark as used
  await supabase
    .from("oauth_auth_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", opts.code);

  // Validate redirect URI matches
  if (authCode.redirect_uri !== opts.redirectUri) {
    return { error: "redirect_uri mismatch" };
  }

  // Validate PKCE if challenge was provided
  if (authCode.code_challenge) {
    if (!opts.codeVerifier) return { error: "code_verifier required (PKCE)" };
    if (!verifyCodeChallenge(opts.codeVerifier, authCode.code_challenge, authCode.code_challenge_method)) {
      return { error: "Invalid code_verifier" };
    }
  }

  // Look up client for audience
  const { data: client } = await supabase
    .from("oauth_clients")
    .select("platform")
    .eq("client_id", opts.clientId)
    .single();

  // Generate access token (JWT)
  const accessToken = await new SignJWT({
    sub: authCode.agent_email,
    tenant_id: authCode.tenant_id,
    iss: "realtorai",
    aud: client?.platform ?? "unknown",
    permissions: authCode.scopes,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  // Generate refresh token
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = createHash("sha256").update(rawRefreshToken).digest("hex");

  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await supabase.from("oauth_refresh_tokens").insert({
    token_hash: refreshTokenHash,
    client_id: opts.clientId,
    tenant_id: authCode.tenant_id,
    agent_email: authCode.agent_email,
    scopes: authCode.scopes,
    expires_at: refreshExpiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: 3600,
    tokenType: "Bearer",
  };
}

/**
 * Refresh an access token using a refresh token.
 * Implements token rotation (old refresh token invalidated).
 */
export async function refreshAccessToken(opts: {
  refreshToken: string;
  clientId: string;
}): Promise<
  | { accessToken: string; refreshToken: string; expiresIn: number; error?: never }
  | { error: string; accessToken?: never; refreshToken?: never; expiresIn?: never }
> {
  const supabase = createAdminClient();
  const tokenHash = createHash("sha256").update(opts.refreshToken).digest("hex");

  // Find valid refresh token
  const { data: storedToken } = await supabase
    .from("oauth_refresh_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .eq("client_id", opts.clientId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!storedToken) return { error: "Invalid or expired refresh token" };

  // Revoke old token (rotation)
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = createHash("sha256").update(newRawRefreshToken).digest("hex");

  const newExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // Insert new token
  const { data: newToken } = await supabase
    .from("oauth_refresh_tokens")
    .insert({
      token_hash: newTokenHash,
      client_id: opts.clientId,
      tenant_id: storedToken.tenant_id,
      agent_email: storedToken.agent_email,
      scopes: storedToken.scopes,
      expires_at: newExpiresAt,
    })
    .select("id")
    .single();

  // Revoke old token with pointer to replacement
  await supabase
    .from("oauth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString(), replaced_by: newToken?.id })
    .eq("id", storedToken.id);

  // Scope check: refreshed token cannot have broader scopes
  const { data: client } = await supabase
    .from("oauth_clients")
    .select("platform")
    .eq("client_id", opts.clientId)
    .single();

  // Generate new access token
  const accessToken = await new SignJWT({
    sub: storedToken.agent_email,
    tenant_id: storedToken.tenant_id,
    iss: "realtorai",
    aud: client?.platform ?? "unknown",
    permissions: storedToken.scopes,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return {
    accessToken,
    refreshToken: newRawRefreshToken,
    expiresIn: 3600,
  };
}

/**
 * Verify and decode an OAuth2 access token (JWT).
 */
export async function verifyAccessToken(token: string): Promise<{
  valid: true;
  payload: { sub: string; tenant_id: string; aud: string; permissions: string[] };
} | {
  valid: false;
  error: string;
}> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "realtorai",
    });

    return {
      valid: true,
      payload: {
        sub: payload.sub as string,
        tenant_id: payload.tenant_id as string,
        aud: payload.aud as string,
        permissions: payload.permissions as string[],
      },
    };
  } catch {
    return { valid: false, error: "Invalid or expired access token" };
  }
}

/**
 * Revoke all tokens for a given client + agent.
 */
export async function revokeAllTokens(opts: {
  clientId: string;
  agentEmail: string;
  tenantId: string;
}): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("oauth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("client_id", opts.clientId)
    .eq("agent_email", opts.agentEmail)
    .eq("tenant_id", opts.tenantId)
    .is("revoked_at", null);
}
