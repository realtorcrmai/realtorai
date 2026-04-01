import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const updateNewsletterSchema = z.object({
  newsletter_id: z.string().uuid(),
  action: z.enum(["approve", "skip"]),
});

/**
 * GET /api/voice-agent/newsletters
 * List newsletters, optionally filtered by status.
 * Query params: status (draft|sent|approved|sending|failed|skipped), contact_id, limit
 */
export async function GET(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("newsletters")
    .select(`
      id, email_type, subject, status, send_mode,
      sent_at, created_at, updated_at,
      contact_id, journey_id, journey_phase, template_slug,
      contacts(id, name, email)
    `)
    .order("created_at", { ascending: false });

  const status = params.get("status");
  if (status) {
    // Support comma-separated status values
    const statuses = status.split(",").map((s) => s.trim());
    if (statuses.length === 1) {
      query = query.eq("status", statuses[0]);
    } else {
      query = query.in("status", statuses);
    }
  }

  const contactId = params.get("contact_id");
  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  const limit = params.get("limit");
  query = query.limit(limit ? Math.min(Number(limit), 100) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ newsletters: data ?? [], count: data?.length ?? 0 });
}

/**
 * PATCH /api/voice-agent/newsletters
 * Approve or skip a newsletter draft.
 * Body: { newsletter_id, action: "approve"|"skip" }
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();
  const parsed = updateNewsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify newsletter exists and is in an actionable state
  const { data: existing } = await supabase
    .from("newsletters")
    .select("id, status, subject, contact_id")
    .eq("id", parsed.data.newsletter_id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });
  }

  if (!["draft", "approved"].includes(existing.status)) {
    return NextResponse.json(
      {
        error: `Cannot ${parsed.data.action} a newsletter with status "${existing.status}"`,
        current_status: existing.status,
      },
      { status: 400 }
    );
  }

  const newStatus = parsed.data.action === "approve" ? "approved" : "skipped";

  const { data, error } = await supabase
    .from("newsletters")
    .update({ status: newStatus })
    .eq("id", parsed.data.newsletter_id)
    .select("id, status, subject, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      newsletter: data,
      message: `Newsletter "${data.subject}" ${parsed.data.action === "approve" ? "approved for sending" : "skipped"}`,
    },
    { status: 200 }
  );
}
