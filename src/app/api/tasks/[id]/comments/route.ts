import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/tasks/[id]/comments — list comments for a task
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify the task belongs to this realtor
  const { data: task } = await tc.from("tasks").select("id").eq("id", taskId).single();
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { data, error } = await admin
    .from("task_comments")
    .select("id, body, created_at, updated_at, realtor_id")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch author names (guard empty array)
  const realtorIds = [...new Set((data ?? []).map((c) => c.realtor_id))];
  if (realtorIds.length === 0) {
    return NextResponse.json([]);
  }
  const { data: users } = await admin
    .from("users")
    .select("id, name")
    .in("id", realtorIds);

  const nameMap = new Map((users ?? []).map((u) => [u.id, u.name]));

  const comments = (data ?? []).map((c) => ({
    ...c,
    author_name: nameMap.get(c.realtor_id) || "Unknown",
  }));

  return NextResponse.json(comments);
}

// POST /api/tasks/[id]/comments — add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { body } = await req.json();
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json({ error: "Comment body is required" }, { status: 400 });
  }

  // Verify the task belongs to this realtor
  const { data: task } = await tc.from("tasks").select("id").eq("id", taskId).single();
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("task_comments")
    .insert({
      task_id: taskId,
      realtor_id: tc.realtorId,
      body: body.trim(),
    })
    .select("id, body, created_at, updated_at, realtor_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get author name
  const { data: user } = await admin
    .from("users")
    .select("name")
    .eq("id", tc.realtorId)
    .single();

  return NextResponse.json(
    { ...data, author_name: user?.name || "Unknown" },
    { status: 201 }
  );
}

// DELETE /api/tasks/[id]/comments?commentId=xxx — delete own comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const commentId = req.nextUrl.searchParams.get("commentId");
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Only delete own comments
  const { error } = await admin
    .from("task_comments")
    .delete()
    .eq("id", commentId)
    .eq("task_id", taskId)
    .eq("realtor_id", tc.realtorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
