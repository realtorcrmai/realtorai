import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/voice-agent/proxy
 * Proxies requests to the external voice agent service (VOICE_AGENT_URL).
 * Adds the server-side VOICE_AGENT_API_KEY so the client never needs NEXT_PUBLIC exposure.
 *
 * Body: { path: string, body: unknown }
 * path: the endpoint path on the voice agent service (e.g. "/api/chat/stream")
 */
export async function POST(request: NextRequest) {
  // Require authenticated session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voiceAgentUrl = process.env.VOICE_AGENT_URL || "http://127.0.0.1:8768";
  const apiKey = process.env.VOICE_AGENT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Voice agent not configured" }, { status: 503 });
  }

  let path: string;
  let proxyBody: unknown;

  try {
    const payload = await request.json();
    path = payload.path;
    proxyBody = payload.body;
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }
    // Restrict to known safe paths
    const allowedPaths = ["/api/chat/stream", "/api/tts", "/api/chat", "/api/health", "/api/session/create"];
    if (!allowedPaths.some((p) => path.startsWith(p))) {
      return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const upstream = await fetch(`${voiceAgentUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(proxyBody),
  });

  // Stream the response back to the client
  if (upstream.headers.get("content-type")?.includes("text/event-stream")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
