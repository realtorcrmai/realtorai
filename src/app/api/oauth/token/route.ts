import { NextResponse } from "next/server";
import { exchangeAuthCode, refreshAccessToken } from "@/lib/oauth/server";

/**
 * OAuth2 Token Endpoint.
 * Supports:
 *   - grant_type=authorization_code (with PKCE)
 *   - grant_type=refresh_token (with rotation)
 */
export async function POST(request: Request) {
  const body = await request.formData().catch(() => null);
  const params = body
    ? Object.fromEntries(body.entries())
    : await request.json().catch(() => ({}));

  const grantType = params.grant_type as string;

  if (grantType === "authorization_code") {
    const code = params.code as string;
    const clientId = params.client_id as string;
    const redirectUri = params.redirect_uri as string;
    const codeVerifier = params.code_verifier as string | undefined;

    if (!code || !clientId || !redirectUri) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        { status: 400 }
      );
    }

    const result = await exchangeAuthCode({ code, clientId, redirectUri, codeVerifier });

    if (result.error) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      token_type: result.tokenType,
      expires_in: result.expiresIn,
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken = params.refresh_token as string;
    const clientId = params.client_id as string;

    if (!refreshToken || !clientId) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing refresh_token or client_id" },
        { status: 400 }
      );
    }

    const result = await refreshAccessToken({ refreshToken, clientId });

    if (result.error) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      token_type: "Bearer",
      expires_in: result.expiresIn,
    });
  }

  return NextResponse.json(
    { error: "unsupported_grant_type", error_description: `Unsupported grant_type: ${grantType}` },
    { status: 400 }
  );
}
