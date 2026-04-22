import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

// GET /api/tasks/[id] — single task detail with subtasks, watchers, dependencies, activity
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { data: task, error } = await tc
    .from("tasks")
    .select("*, contacts(id, name, email, phone), listings(id, address, status, list_price), task_comments(count)")
    .eq("id", id)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Fetch subtasks, watchers, dependencies, activity, assignee in parallel
  const [subtasksRes, watchersRes, blockersRes, blockedByRes, activityRes, assigneeRes] = await Promise.all([
    tc.from("tasks").select("id, title, status, priority, due_date, assigned_to, position")
      .eq("parent_id", id).order("position").order("created_at"),
    tc.raw.from("task_watchers").select("user_id, users(name, email)").eq("task_id", id),
    tc.raw.from("task_dependencies").select("blocked_id, tasks!task_dependencies_blocked_id_fkey(id, title, status)")
      .eq("blocker_id", id),
    tc.raw.from("task_dependencies").select("blocker_id, tasks!task_dependencies_blocker_id_fkey(id, title, status)")
      .eq("blocked_id", id),
    tc.raw.from("task_activity").select("id, user_id, action, field_name, old_value, new_value, metadata, created_at, users(name)")
      .eq("task_id", id).order("created_at", { ascending: false }).limit(50),
    task.assigned_to
      ? tc.raw.from("users").select("id, name, email").eq("id", task.assigned_to).single()
      : Promise.resolve({ data: null }),
  ]);

  const commentAgg = task.task_comments as { count: number }[] | undefined;
  const { task_comments: _, ...taskData } = task;

  // Resolve user UUIDs in activity old_value/new_value for assigned_to changes
  const activityItems = (activityRes.data ?? []) as Record<string, unknown>[];
  const assigneeUuids = new Set<string>();
  for (const a of activityItems) {
    if (a.action === "assigned" || a.field_name === "assigned_to") {
      if (a.old_value && typeof a.old_value === "string" && a.old_value.includes("-")) assigneeUuids.add(a.old_value);
      if (a.new_value && typeof a.new_value === "string" && a.new_value.includes("-")) assigneeUuids.add(a.new_value);
    }
  }
  let activityUserMap = new Map<string, string>();
  if (assigneeUuids.size > 0) {
    const { data: actUsers } = await tc.raw.from("users").select("id, name").in("id", [...assigneeUuids]);
    activityUserMap = new Map((actUsers ?? []).map((u: { id: string; name: string }) => [u.id, u.name || "Unknown"]));
  }

  return NextResponse.json({
    ...taskData,
    comment_count: Number(commentAgg?.[0]?.count ?? 0),
    assignee: assigneeRes.data || null,
    subtasks: subtasksRes.data ?? [],
    watchers: (watchersRes.data ?? []).map((w: Record<string, unknown>) => ({
      user_id: w.user_id,
      ...(w.users as Record<string, unknown> || {}),
    })),
    blocks: (blockersRes.data ?? []).map((d: Record<string, unknown>) => d.tasks),
    blocked_by: (blockedByRes.data ?? []).map((d: Record<string, unknown>) => d.tasks),
    activity: activityItems.map((a) => {
      let oldValue = a.old_value as string | null;
      let newValue = a.new_value as string | null;
      if (a.action === "assigned" || a.field_name === "assigned_to") {
        if (oldValue && activityUserMap.has(oldValue)) oldValue = activityUserMap.get(oldValue)!;
        if (newValue && activityUserMap.has(newValue)) newValue = activityUserMap.get(newValue)!;
      }
      return {
        ...a,
        old_value: oldValue,
        new_value: newValue,
        user_name: (a.users as Record<string, unknown>)?.name || "Unknown",
        users: undefined,
      };
    }),
  });
}

// POST /api/tasks/[id]/duplicate — duplicate a task
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { data: original } = await tc.from("tasks").select("*").eq("id", id).single();
  if (!original) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const { id: _id, created_at: _c, updated_at: _u, completed_at: _ca, archived_at: _a, ...fields } = original;

  const { data: newTask, error } = await tc
    .from("tasks")
    .insert({ ...fields, title: `${fields.title} (copy)`, status: "pending" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await tc.raw.from("task_activity").insert({
    task_id: newTask.id, user_id: tc.realtorId, action: "duplicated",
    metadata: { source_id: id },
  });

  revalidatePath("/tasks");
  return NextResponse.json(newTask, { status: 201 });
}
