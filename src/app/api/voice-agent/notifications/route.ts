import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";

export async function GET(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const { searchParams } = new URL(request.url);
  const agentEmail = searchParams.get("agent_email");
  const unreadOnly = searchParams.get("unread") === "true";

  const supabase = createAdminClient();
  let query = supabase
    .from("voice_notifications")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (agentEmail) query = query.eq("agent_email", agentEmail);
  if (unreadOnly) query = query.is("read_at", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: data });
}

export async function PATCH(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const body = await request.json();
  const { notification_id, action } = body;

  if (!notification_id) {
    return NextResponse.json({ error: "notification_id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (action === "read") {
    await supabase
      .from("voice_notifications")
      .update({ read_at: now })
      .eq("id", notification_id)
      .eq("tenant_id", auth.tenantId);
  } else if (action === "spoken") {
    await supabase
      .from("voice_notifications")
      .update({ spoken_at: now, read_at: now })
      .eq("id", notification_id)
      .eq("tenant_id", auth.tenantId);
  }

  return NextResponse.json({ success: true });
}
