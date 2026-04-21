import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/tasks/[id]/subtasks
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { data, error } = await tc
    .from("tasks")
    .select("id, title, status, priority, category, due_date, assigned_to, position, completed_at")
    .eq("parent_id", id)
    .order("position")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/tasks/[id]/subtasks — create subtask
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: parentId } = await params;
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { data: parent } = await tc.from("tasks").select("id").eq("id", parentId).single();
  if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });

  const body = await req.json();
  const { title, priority, category, due_date, assigned_to } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { data, error } = await tc
    .from("tasks")
    .insert({
      title: title.trim(),
      parent_id: parentId,
      priority: priority || "medium",
      category: category || "general",
      due_date: due_date || null,
      assigned_to: assigned_to || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const admin = createAdminClient();
  await admin.from("task_activity").insert({
    task_id: parentId, user_id: tc.realtorId, action: "subtask_added",
    new_value: data.id, metadata: { subtask_title: title.trim() },
  });

  revalidatePath("/tasks");
  return NextResponse.json(data, { status: 201 });
}
