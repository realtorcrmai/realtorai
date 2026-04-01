import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const createCommunicationSchema = z.object({
  contact_id: z.string().uuid(),
  direction: z.enum(["inbound", "outbound"]),
  channel: z.enum(["sms", "whatsapp", "email", "note"]),
  body: z.string().min(1),
  related_id: z.string().uuid().optional(),
});

/**
 * GET /api/voice-agent/communications
 * List communications for a contact (contact_id required).
 * Query params: contact_id (required), channel, limit
 * Returns most recent first.
 */
export async function GET(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  // contact_id is required
  const contactId = params.get("contact_id");
  if (!contactId) {
    return NextResponse.json(
      { error: "contact_id query parameter is required" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("communications")
    .select("id, contact_id, direction, channel, body, related_id, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  // Filter by channel
  const channel = params.get("channel");
  if (channel) {
    query = query.eq("channel", channel);
  }

  // Limit
  const limit = params.get("limit");
  query = query.limit(limit ? Number(limit) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ communications: data ?? [], count: data?.length ?? 0 });
}

/**
 * POST /api/voice-agent/communications
 * Create a communication or note for a contact.
 * Body: { contact_id, direction: "inbound"|"outbound", channel: "sms"|"whatsapp"|"email"|"note", body, related_id? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();

  const parsed = createCommunicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("communications")
    .insert({
      contact_id: parsed.data.contact_id,
      direction: parsed.data.direction,
      channel: parsed.data.channel,
      body: parsed.data.body,
      related_id: parsed.data.related_id || null,
    })
    .select("id, contact_id, direction, channel, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, contact_id: data.contact_id }, { status: 201 });
}
