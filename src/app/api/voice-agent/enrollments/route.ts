import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const updateEnrollmentSchema = z.object({
  enrollment_id: z.string().uuid(),
  action: z.enum(["pause", "resume", "exit"]),
  exit_reason: z.string().optional().nullable(),
});

const ACTION_TO_STATUS: Record<string, string> = {
  pause: "paused",
  resume: "active",
  exit: "exited",
};

/**
 * GET /api/voice-agent/enrollments
 * List enrollments for a contact or workflow.
 * Query params: contact_id OR workflow_id (at least one required), status, limit
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const supabase = createAdminClient();
    const params = req.nextUrl.searchParams;

    const contactId = params.get("contact_id");
    const workflowId = params.get("workflow_id");

    if (!contactId && !workflowId) {
      return NextResponse.json(
        { error: "Either contact_id or workflow_id query parameter is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("workflow_enrollments")
      .select(`
        id, status, current_step, next_run_at,
        started_at, completed_at, exit_reason, created_at, updated_at,
        workflow_id, contact_id, listing_id,
        workflows(id, slug, name, trigger_type),
        contacts(id, name, phone, email)
      `)
      .order("created_at", { ascending: false });

    if (contactId) query = query.eq("contact_id", contactId);
    if (workflowId) query = query.eq("workflow_id", workflowId);

    const status = params.get("status");
    if (status) query = query.eq("status", status);

    const limit = params.get("limit");
    query = query.limit(limit ? Math.min(Number(limit), 100) : 20);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ enrollments: data ?? [], count: data?.length ?? 0 });
  } catch (err) {
    console.error("[voice-agent] enrollments GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/voice-agent/enrollments
 * Update enrollment status: pause, resume, or exit.
 * Body: { enrollment_id, action: "pause"|"resume"|"exit", exit_reason? }
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = requireVoiceAgentAuth(req);
    if (!auth.authorized) return auth.error;

    const body = await req.json();
    const parsed = updateEnrollmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify enrollment exists
    const { data: existing } = await supabase
      .from("workflow_enrollments")
      .select("id, status")
      .eq("id", parsed.data.enrollment_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    const newStatus = ACTION_TO_STATUS[parsed.data.action];

    // Validate state transitions
    if (parsed.data.action === "pause" && existing.status !== "active") {
      return NextResponse.json(
        { error: "Only active enrollments can be paused" },
        { status: 400 }
      );
    }
    if (parsed.data.action === "resume" && existing.status !== "paused") {
      return NextResponse.json(
        { error: "Only paused enrollments can be resumed" },
        { status: 400 }
      );
    }
    if (
      parsed.data.action === "exit" &&
      ["completed", "exited", "failed"].includes(existing.status)
    ) {
      return NextResponse.json(
        { error: "Enrollment is already in a terminal state" },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (parsed.data.action === "exit") {
      updatePayload.exit_reason = parsed.data.exit_reason ?? "exited_via_voice_agent";
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("workflow_enrollments")
      .update(updatePayload)
      .eq("id", parsed.data.enrollment_id)
      .select("id, status, exit_reason, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, enrollment: data }, { status: 200 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.error("[voice-agent] enrollments PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
