import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  status: z.string().optional(),
  priority: z.string().optional(),
  due_date: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

/**
 * GET /api/voice-agent/tasks
 * List tasks with optional filters.
 * Query params: status, priority, contact_id, listing_id, limit
 */
export async function GET(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, contact_id, listing_id, category, completed_at, created_at")
    .order("created_at", { ascending: false });

  // Filter by status
  const status = params.get("status");
  if (status) {
    query = query.eq("status", status);
  }

  // Filter by priority
  const priority = params.get("priority");
  if (priority) {
    query = query.eq("priority", priority);
  }

  // Filter by contact_id
  const contactId = params.get("contact_id");
  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  // Filter by listing_id
  const listingId = params.get("listing_id");
  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  // Limit
  const limit = params.get("limit");
  query = query.limit(limit ? Number(limit) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [], count: data?.length ?? 0 });
}

/**
 * POST /api/voice-agent/tasks
 * Create a new task.
 * Body: { title, status?, priority?, due_date?, contact_id?, listing_id?, category?, description? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: parsed.data.title,
      status: parsed.data.status || "pending",
      priority: parsed.data.priority || "medium",
      due_date: parsed.data.due_date || null,
      contact_id: parsed.data.contact_id || null,
      listing_id: parsed.data.listing_id || null,
      category: parsed.data.category || null,
      description: parsed.data.description || null,
    })
    .select("id, title, status, priority, due_date, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id, title: data.title }, { status: 201 });
}
