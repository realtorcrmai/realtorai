import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/voice-agent/proxy/stt
 * Proxies multipart audio to the external voice agent STT endpoint.
 * Adds the server-side VOICE_AGENT_API_KEY so the client never needs it.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const voiceAgentUrl = process.env.VOICE_AGENT_URL || "http://127.0.0.1:8768";
  const apiKey = process.env.VOICE_AGENT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Voice agent not configured" }, { status: 503 });
  }

  const formData = await request.formData();

  const upstream = await fetch(`${voiceAgentUrl}/api/stt`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
