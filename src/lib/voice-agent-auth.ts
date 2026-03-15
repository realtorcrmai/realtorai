import { NextResponse } from "next/server";

/**
 * Require Bearer token authentication for voice agent API routes.
 * Uses the shared VOICE_AGENT_API_KEY env var for server-to-server auth
 * (bypasses NextAuth session auth which is for browser users).
 */
export function requireVoiceAgentAuth(request: Request) {
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
  if (auth !== `Bearer ${key}`) {
    return {
      authorized: false as const,
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { authorized: true as const, error: null };
}
