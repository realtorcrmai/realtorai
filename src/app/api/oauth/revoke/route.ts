import { NextResponse } from "next/server";
import { revokeAllTokens, verifyAccessToken } from "@/lib/oauth/server";

/**
 * OAuth2 Token Revocation Endpoint (RFC 7009).
 * Revokes all refresh tokens for the authenticated user + client.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = auth.slice(7);
  const verified = await verifyAccessToken(token);
  if (!verified.valid) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const clientId = body.client_id as string;

  if (!clientId) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing client_id" },
      { status: 400 }
    );
  }

  await revokeAllTokens({
    clientId,
    agentEmail: verified.payload.sub,
    tenantId: verified.payload.tenant_id,
  });

  return NextResponse.json({ revoked: true });
}
