import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";

/**
 * POST /api/voice-agent/feedback
 * Log client feedback as a communication record.
 * Body: { contact_id?, client_name, client_phone?, listing_id?, feedback, sentiment?, follow_up? }
 */
export async function POST(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();

  if (!body.feedback) {
    return NextResponse.json({ error: "feedback is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let contactId = body.contact_id;

  // Try to resolve contact_id from client_name if not provided
  if (!contactId && body.client_name) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .ilike("name", `%${body.client_name}%`)
      .limit(1);

    if (contacts && contacts.length > 0) {
      contactId = contacts[0].id;
    } else if (body.client_phone || body.client_name) {
      // Auto-create a buyer contact for this feedback
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          name: body.client_name,
          phone: body.client_phone || "",
          type: "buyer" as const,
          pref_channel: "sms" as const,
        })
        .select("id")
        .single();

      if (newContact) {
        contactId = newContact.id;
      }
    }
  }

  if (!contactId) {
    return NextResponse.json(
      { error: "Could not resolve or create contact. Provide contact_id or client_name." },
      { status: 400 }
    );
  }

  // Build feedback body with metadata
  const parts: string[] = [];
  if (body.sentiment) parts.push(`[Sentiment: ${body.sentiment}]`);
  if (body.listing_id) parts.push(`[Listing: ${body.listing_id}]`);
  if (body.follow_up) parts.push(`[Follow-up requested]`);
  parts.push(body.feedback);

  const { data, error } = await supabase
    .from("communications")
    .insert({
      contact_id: contactId,
      direction: "inbound" as const,
      channel: "note" as const,
      body: parts.join(" "),
      related_id: body.listing_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, communication_id: data.id, contact_id: contactId }, { status: 201 });
}
