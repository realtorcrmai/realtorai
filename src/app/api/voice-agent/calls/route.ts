import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";

export async function GET(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contact_id");
  const sessionId = searchParams.get("session_id");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  const supabase = createAdminClient();
  let query = supabase
    .from("voice_calls")
    .select("*")
    .eq("tenant_id", auth.tenantId)
    .order("started_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (contactId) query = query.eq("contact_id", contactId);
  if (sessionId) query = query.eq("session_id", sessionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ calls: data });
}

export async function POST(request: Request) {
  const auth = await requireVoiceAgentAuth(request);
  if (!auth.authorized) return auth.error;

  const body = await request.json();

  // Don't log accidental activations
  if (body.duration_seconds !== undefined && body.duration_seconds < 5) {
    return NextResponse.json({ skipped: true });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("voice_calls")
    .insert({
      tenant_id: auth.tenantId,
      session_id: body.session_id ?? null,
      contact_id: body.contact_id ?? null,
      listing_id: body.listing_id ?? null,
      direction: body.direction ?? "outbound",
      duration_seconds: body.duration_seconds ?? 0,
      transcript: body.transcript ?? null,
      summary: body.summary ?? null,
      tool_calls_used: body.tool_calls_used ?? [],
      llm_provider: body.llm_provider ?? null,
      total_input_tokens: body.total_input_tokens ?? 0,
      total_output_tokens: body.total_output_tokens ?? 0,
      cost_usd: body.cost_usd ?? 0,
      compliance_flagged: body.compliance_flagged ?? false,
      compliance_notes: body.compliance_notes ?? null,
      started_at: body.started_at ?? new Date().toISOString(),
      ended_at: body.ended_at ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also log to communications if contact context exists
  if (body.contact_id && body.transcript) {
    await supabase.from("communications").insert({
      contact_id: body.contact_id,
      direction: "outbound",
      channel: "note",
      body: `[Voice Call] ${(body.transcript as string).slice(0, 500)}`,
      related_type: body.listing_id ? "listing" : null,
      related_id: body.listing_id ?? null,
    });
  }

  return NextResponse.json({ call: data }, { status: 201 });
}
