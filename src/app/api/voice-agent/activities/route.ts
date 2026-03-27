import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const VALID_ACTIVITY_TYPES = [
  "call", "email", "sms", "whatsapp", "meeting", "note",
  "property_showing", "open_house", "website_visit",
  "email_open", "link_click", "form_submission",
  "document_signed", "offer_submitted", "offer_received",
] as const;

const createActivitySchema = z.object({
  contact_id: z.string().uuid(),
  activity_type: z.enum(VALID_ACTIVITY_TYPES),
  description: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  outcome: z
    .enum([
      "completed", "no_answer", "voicemail", "callback_requested",
      "interested", "not_interested", "follow_up_needed", "cancelled",
    ])
    .optional()
    .nullable(),
  direction: z.enum(["inbound", "outbound"]).optional().nullable(),
  duration_minutes: z.number().int().min(0).optional().nullable(),
  follow_up_date: z.string().optional().nullable(),
  listing_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/voice-agent/activities
 * List activities for a contact.
 * Query params: contact_id (required), activity_type, limit
 */
export async function GET(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  const contactId = params.get("contact_id");
  if (!contactId) {
    return NextResponse.json(
      { error: "contact_id query parameter is required" },
      { status: 400 }
    );
  }

  let query = supabase
    .from("activities")
    .select(
      "id, activity_type, subject, description, outcome, direction, duration_minutes, follow_up_date, listing_id, metadata, created_at"
    )
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  const activityType = params.get("activity_type");
  if (activityType) {
    query = query.eq("activity_type", activityType);
  }

  const limit = params.get("limit");
  query = query.limit(limit ? Math.min(Number(limit), 100) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activities: data ?? [], count: data?.length ?? 0 });
}

/**
 * POST /api/voice-agent/activities
 * Log a new activity for a contact.
 * Body: { contact_id, activity_type, description?, subject?, outcome?, direction?, duration_minutes?, follow_up_date?, listing_id?, metadata? }
 */
export async function POST(req: NextRequest) {
  const auth = requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();
  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify contact exists
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("id", parsed.data.contact_id)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("activities")
    .insert({
      contact_id: parsed.data.contact_id,
      activity_type: parsed.data.activity_type,
      subject: parsed.data.subject ?? null,
      description: parsed.data.description ?? null,
      outcome: parsed.data.outcome ?? null,
      direction: parsed.data.direction ?? null,
      duration_minutes: parsed.data.duration_minutes ?? null,
      follow_up_date: parsed.data.follow_up_date ?? null,
      listing_id: parsed.data.listing_id ?? null,
      metadata: parsed.data.metadata ?? {},
    })
    .select("id, activity_type, subject, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also update last_activity_date on contacts if the column exists
  await supabase
    .from("contacts")
    .update({ last_activity_date: new Date().toISOString() })
    .eq("id", parsed.data.contact_id);

  return NextResponse.json(
    {
      ok: true,
      id: data.id,
      activity_type: data.activity_type,
      contact_name: contact.name,
    },
    { status: 201 }
  );
}
