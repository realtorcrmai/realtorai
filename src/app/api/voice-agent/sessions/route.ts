import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createVoiceSession, endVoiceSession } from "@/lib/voice-session-manager";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";

export async function GET(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const { searchParams } = new URL(request.url);
  const agentEmail = searchParams.get("agent_email");
  const status = searchParams.get("status");

  const supabase = createAdminClient();
  let query = supabase
    .from("voice_sessions")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (agentEmail) query = query.eq("agent_email", agentEmail);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sessions: data });
}

export async function POST(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const { agent_email, mode, source, focus_type, focus_id } = body;

  if (!agent_email) {
    return NextResponse.json({ error: "agent_email is required" }, { status: 400 });
  }

  const result = await createVoiceSession({
    tenantId: auth.tenantId,
    agentEmail: agent_email,
    mode: mode ?? "realtor",
    source: source ?? "browser",
    focusType: focus_type ?? null,
    focusId: focus_id ?? null,
  });

  if (result.error) {
    const status = result.error.includes("Rate limit") ? 429 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ session: result.session }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const result = await endVoiceSession(sessionId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
