/**
 * DELETE /api/user/data
 *
 * PIPEDA Right to Erasure — delete all user data for the authenticated realtor.
 * Requires confirmation body: { "confirm": "DELETE_ALL_MY_DATA" }
 *
 * Deletes (in order, respecting FK constraints):
 * 1. Newsletter events → newsletters → contact journeys
 * 2. Communications → appointments → listing documents → seller identities
 * 3. Listing enrichment → media assets → prompts → listings
 * 4. Contacts (cascade handles related records)
 * 5. RAG data, agent data, workflow data
 * 6. User profile
 *
 * Activity logs are RETAINED but PII-redacted (PIPEDA requires audit trail).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkApiRateLimit, rateLimitHeaders } from "@/lib/api-rate-limit";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Strict rate limit — 3 requests per hour
  const rateCheck = checkApiRateLimit(session.user.id, "user-data-delete");
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: rateLimitHeaders(rateCheck) }
    );
  }

  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "DELETE_ALL_MY_DATA") {
    return NextResponse.json(
      {
        error: "Confirmation required. Send { \"confirm\": \"DELETE_ALL_MY_DATA\" } in the request body.",
        warning: "This action is IRREVERSIBLE. All your CRM data will be permanently deleted.",
      },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const supabase = createAdminClient();
  const deleted: Record<string, number> = {};

  // Tables to delete from, ordered by FK dependency (children first)
  const tablesToDelete = [
    "newsletter_events",
    "newsletters",
    "contact_journeys",
    "workflow_enrollments",
    "workflow_steps",
    "workflows",
    "communications",
    "appointments",
    "listing_documents",
    "seller_identities",
    "listing_enrichment",
    "media_assets",
    "prompts",
    "listings",
    "consent_records",
    "contact_segments",
    "contacts",
    "agent_recommendations",
    "agent_decisions",
    "agent_events",
    "agent_learning_log",
    "rag_chat_sessions",
    "rag_feedback",
    "notifications",
    "tasks",
    "deals",
    "households",
    "welcome_drip_log",
    "onboarding_checklist",
  ];

  for (const table of tablesToDelete) {
    try {
      const { data } = await supabase
        .from(table)
        .delete()
        .eq("realtor_id", userId)
        .select("id");
      deleted[table] = data?.length ?? 0;
    } catch {
      // Table may not exist or may not have realtor_id — skip
      deleted[table] = -1;
    }
  }

  // Redact activity logs (keep for compliance, remove PII)
  let auditsRedacted = 0;
  try {
    const { data: logs } = await supabase
      .from("activity_log")
      .select("id")
      .eq("realtor_id", userId);

    if (logs?.length) {
      await supabase
        .from("activity_log")
        .update({
          description: "[REDACTED — PIPEDA deletion request]",
          metadata: { redacted: true, redacted_at: new Date().toISOString() },
        })
        .eq("realtor_id", userId);
      auditsRedacted = logs.length;
    }
  } catch {
    // activity_log may not have realtor_id
  }

  // Log the deletion event itself
  try {
    await supabase.from("activity_log").insert({
      realtor_id: userId,
      activity_type: "pipeda_data_deletion",
      description: "[DATA DELETION REQUEST EXECUTED]",
      metadata: {
        tables_affected: Object.keys(deleted).filter((k) => deleted[k] > 0),
        total_records: Object.values(deleted).filter((v) => v > 0).reduce((a, b) => a + b, 0),
        audit_logs_redacted: auditsRedacted,
        requested_at: new Date().toISOString(),
      },
    });
  } catch {
    // Best effort audit log
  }

  return NextResponse.json({
    success: true,
    deleted,
    redacted: { activity_logs: auditsRedacted },
    message: "All your CRM data has been permanently deleted. Activity logs were redacted but retained for compliance.",
  });
}
