import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const enrollContactSchema = z.object({
  workflow_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  listing_id: z.string().uuid().optional().nullable(),
});

/**
 * GET /api/voice-agent/workflows
 * List all active workflows with step count and enrollment counts.
 */
export async function GET(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  const activeOnly = params.get("active_only") !== "false"; // default: true

  let query = supabase
    .from("workflows")
    .select("id, slug, name, description, trigger_type, trigger_config, contact_type, is_active, max_enrollments, created_at")
    .order("name", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data: workflows, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!workflows || workflows.length === 0) {
    return NextResponse.json({ workflows: [], count: 0 });
  }

  // Fetch enrollment counts in bulk
  const workflowIds = workflows.map((w) => w.id);

  const { data: enrollmentRows } = await supabase
    .from("workflow_enrollments")
    .select("workflow_id, status")
    .in("workflow_id", workflowIds);

  // Build count maps
  const totalMap: Record<string, number> = {};
  const activeMap: Record<string, number> = {};
  for (const row of enrollmentRows ?? []) {
    totalMap[row.workflow_id] = (totalMap[row.workflow_id] ?? 0) + 1;
    if (row.status === "active") {
      activeMap[row.workflow_id] = (activeMap[row.workflow_id] ?? 0) + 1;
    }
  }

  const enriched = workflows.map((w) => ({
    ...w,
    enrollments_total: totalMap[w.id] ?? 0,
    enrollments_active: activeMap[w.id] ?? 0,
  }));

  return NextResponse.json({ workflows: enriched, count: enriched.length });
}

/**
 * POST /api/voice-agent/workflows
 * Enroll a contact in a workflow.
 * Body: { workflow_id, contact_id, listing_id? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();
  const parsed = enrollContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify workflow exists and is active
  const { data: workflow } = await supabase
    .from("workflows")
    .select("id, name, is_active, max_enrollments")
    .eq("id", parsed.data.workflow_id)
    .single();

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 400 });
  }

  if (!workflow.is_active) {
    return NextResponse.json({ error: "Workflow is not active" }, { status: 400 });
  }

  // Check for existing active enrollment (respects unique index)
  const { data: existing } = await supabase
    .from("workflow_enrollments")
    .select("id, status")
    .eq("workflow_id", parsed.data.workflow_id)
    .eq("contact_id", parsed.data.contact_id)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Contact is already actively enrolled in this workflow", enrollment_id: existing.id },
      { status: 409 }
    );
  }

  // Verify contact exists
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("id", parsed.data.contact_id)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 400 });
  }

  const { data: enrollment, error } = await supabase
    .from("workflow_enrollments")
    .insert({
      workflow_id: parsed.data.workflow_id,
      contact_id: parsed.data.contact_id,
      listing_id: parsed.data.listing_id ?? null,
      status: "active",
      current_step: 1,
      started_at: new Date().toISOString(),
    })
    .select("id, status, current_step, started_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      enrollment_id: enrollment.id,
      workflow_name: workflow.name,
      contact_name: contact.name,
      status: enrollment.status,
    },
    { status: 201 }
  );
}
