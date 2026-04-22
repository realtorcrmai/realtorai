import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient, getScopedTenantClient } from "@/lib/supabase/tenant";

import { taskSchema } from "@/lib/schemas";
import { PRIORITY_SORT_WEIGHT } from "@/lib/constants/tasks";
import type { TaskPriority } from "@/lib/constants/tasks";
import type { DataScope } from "@/types/team";

// ── GET /api/tasks — list with pagination, filters, search ──
export async function GET(req: NextRequest) {
  let tc;
  const sp = req.nextUrl.searchParams;
  try {
    const scope = (sp.get("scope") || "personal") as DataScope;
    tc = await getScopedTenantClient(scope);
  } catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  // Pagination
  const page = Math.max(1, parseInt(sp.get("page") || "1") || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(sp.get("per_page") || "50") || 50));
  const offset = (page - 1) * perPage;

  let query = tc
    .from("tasks")
    .select("*, contacts(name), listings(address), task_comments(count)", { count: "exact" });

  // Status filter (comma-separated)
  const status = sp.get("status");
  if (status) {
    const arr = status.split(",").filter((s) => ["pending", "in_progress", "completed"].includes(s));
    if (arr.length === 1) query = query.eq("status", arr[0]);
    else if (arr.length > 1) query = query.in("status", arr);
  }

  // Priority filter
  const priority = sp.get("priority");
  if (priority) {
    const arr = priority.split(",").filter((p) => ["low", "medium", "high", "urgent"].includes(p));
    if (arr.length === 1) query = query.eq("priority", arr[0]);
    else if (arr.length > 1) query = query.in("priority", arr);
  }

  // Category filter
  const category = sp.get("category");
  if (category) {
    const arr = category.split(",");
    if (arr.length === 1) query = query.eq("category", arr[0]);
    else if (arr.length > 1) query = query.in("category", arr);
  }

  // Assignee filter
  const assignedTo = sp.get("assigned_to");
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  // Related entity filters
  const contactId = sp.get("contact_id");
  if (contactId) query = query.eq("contact_id", contactId);
  const listingId = sp.get("listing_id");
  if (listingId) query = query.eq("listing_id", listingId);

  // Parent filter (for subtasks)
  const parentId = sp.get("parent_id");
  if (parentId === "null") query = query.is("parent_id", null);
  else if (parentId) query = query.eq("parent_id", parentId);

  // Scope: mine, assigned, team
  const scope = sp.get("scope");
  if (scope === "mine") query = query.eq("realtor_id", tc.realtorId);
  else if (scope === "assigned") query = query.eq("assigned_to", tc.realtorId);
  else if (scope === "team") query = query.eq("visibility", "team");

  // Date range
  const dueDateFrom = sp.get("due_date_from");
  if (dueDateFrom) query = query.gte("due_date", dueDateFrom);
  const dueDateTo = sp.get("due_date_to");
  if (dueDateTo) query = query.lte("due_date", dueDateTo);

  // Archive filter
  const archived = sp.get("archived");
  if (archived === "true") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);

  // Search
  const search = sp.get("search");
  if (search?.trim()) {
    const term = search.trim().replace(/'/g, "''");
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  // Labels filter
  const labels = sp.get("labels");
  if (labels) {
    for (const label of labels.split(",")) {
      query = query.contains("labels", [label]);
    }
  }

  // Sorting
  const sortBy = sp.get("sort_by") || "priority";
  const sortDesc = sp.get("sort_dir") === "desc";

  if (sortBy === "position") {
    query = query.order("position", { ascending: true }).order("created_at", { ascending: false });
  } else if (sortBy === "due_date") {
    query = query.order("due_date", { ascending: !sortDesc, nullsFirst: false });
  } else if (sortBy === "title") {
    query = query.order("title", { ascending: !sortDesc });
  } else if (sortBy === "created_at") {
    query = query.order("created_at", { ascending: !sortDesc });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + perPage - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch assignee names in batch
  const assigneeIds = [...new Set((data ?? []).map((t: Record<string, unknown>) => t.assigned_to as string).filter(Boolean))];
  let assigneeMap = new Map<string, { name: string; email: string }>();
  if (assigneeIds.length > 0) {
    const { data: users } = await tc.raw.from("users").select("id, name, email").in("id", assigneeIds);
    assigneeMap = new Map((users ?? []).map((u) => [u.id, { name: u.name ?? "", email: u.email }]));
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const tasks = (data ?? []).map((t: Record<string, unknown>) => {
    const commentAgg = t.task_comments as { count: number }[] | undefined;
    const comment_count = Number(commentAgg?.[0]?.count ?? 0);
    const assignee = assigneeMap.get(t.assigned_to as string);
    const { task_comments: _, ...rest } = t;
    return {
      ...rest,
      comment_count,
      assignee_name: assignee?.name || null,
      assignee_email: assignee?.email || null,
      is_overdue: !!(rest.due_date && (rest.due_date as string) < todayStr && rest.status !== "completed"),
    };
  });

  // Smart sort for default priority mode
  if (sortBy === "priority") {
    tasks.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      if (a.is_overdue && !b.is_overdue) return -1;
      if (!a.is_overdue && b.is_overdue) return 1;
      const aPri = PRIORITY_SORT_WEIGHT[(a.priority as TaskPriority)] ?? 2;
      const bPri = PRIORITY_SORT_WEIGHT[(b.priority as TaskPriority)] ?? 2;
      if (aPri !== bPri) return aPri - bPri;
      if (a.due_date && b.due_date) return (a.due_date as string).localeCompare(b.due_date as string);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
  }

  return NextResponse.json({
    data: tasks,
    pagination: { page, per_page: perPage, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / perPage) },
  });
}

// ── POST /api/tasks — create ──
export async function POST(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const { data: taskData, error } = await tc
    .from("tasks")
    .insert({
      ...parsed.data,
      due_date: parsed.data.due_date || null,
      start_date: parsed.data.start_date || null,
      contact_id: parsed.data.contact_id || null,
      listing_id: parsed.data.listing_id || null,
      assigned_to: parsed.data.assigned_to || null,
      parent_id: parsed.data.parent_id || null,
      description: parsed.data.description || null,
      labels: parsed.data.labels || [],
      recurrence_rule: parsed.data.recurrence_rule || null,
    })
    .select("*, contacts(name), listings(address)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Activity log + notifications
  await tc.raw.from("task_activity").insert({ task_id: taskData.id, user_id: tc.realtorId, action: "created" });

  if (parsed.data.assigned_to && parsed.data.assigned_to !== tc.realtorId) {
    await tc.raw.from("notifications").insert({
      realtor_id: parsed.data.assigned_to,
      type: "task_assigned",
      title: "New task assigned to you",
      body: parsed.data.title,
      related_type: "task",
      related_id: taskData.id,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json(taskData, { status: 201 });
}

const PATCH_ALLOWED = new Set([
  "title", "description", "status", "priority", "category",
  "due_date", "start_date", "contact_id", "listing_id", "assigned_to",
  "parent_id", "estimated_hours", "labels", "visibility",
  "recurrence_rule", "position", "archived_at",
]);

// ── PATCH /api/tasks — update ──
export async function PATCH(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();
  const { id, ...rawUpdates } = body;
  if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

  const { data: current } = await tc.from("tasks").select("*").eq("id", id).single();
  if (!current) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawUpdates)) {
    if (PATCH_ALLOWED.has(key)) updates[key] = value;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (updates.status === "completed") updates.completed_at = new Date().toISOString();
  if (updates.status && updates.status !== "completed") updates.completed_at = null;

  const { data, error } = await tc
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*, contacts(name), listings(address)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log activity
  const activities: { task_id: string; user_id: string; action: string; field_name: string; old_value: string | null; new_value: string | null }[] = [];
  for (const [key, value] of Object.entries(updates)) {
    const oldVal = (current as Record<string, unknown>)[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(value)) {
      let action = "updated";
      if (key === "status") action = "status_changed";
      else if (key === "assigned_to") action = "assigned";
      else if (key === "priority") action = "priority_changed";
      else if (key === "archived_at") action = value ? "archived" : "unarchived";
      activities.push({
        task_id: id, user_id: tc.realtorId, action, field_name: key,
        old_value: oldVal != null ? String(oldVal) : null,
        new_value: value != null ? String(value) : null,
      });
    }
  }
  if (activities.length > 0) await tc.raw.from("task_activity").insert(activities);

  // Notify on reassignment
  if (updates.assigned_to && updates.assigned_to !== tc.realtorId && updates.assigned_to !== current.assigned_to) {
    await tc.raw.from("notifications").insert({
      realtor_id: updates.assigned_to as string,
      type: "task_assigned",
      title: "Task assigned to you",
      body: current.title,
      related_type: "task",
      related_id: id,
    });
  }

  // Recurrence: create next instance on completion
  if (updates.status === "completed" && current.recurrence_rule && current.due_date) {
    const next = computeNext(current.recurrence_rule, current.due_date);
    if (next) {
      const gap = current.start_date && current.due_date
        ? Math.round((new Date(current.due_date).getTime() - new Date(current.start_date).getTime()) / 86400000)
        : 0;
      await tc.from("tasks").insert({
        title: current.title, description: current.description,
        priority: current.priority, category: current.category,
        due_date: next,
        start_date: gap > 0 ? offsetDate(next, -gap) : null,
        contact_id: current.contact_id, listing_id: current.listing_id,
        assigned_to: current.assigned_to, labels: current.labels,
        visibility: current.visibility, recurrence_rule: current.recurrence_rule,
        status: "pending",
      });
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json(data);
}

// ── DELETE /api/tasks ──
export async function DELETE(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

  const { error } = await tc.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json({ success: true });
}

// ── Helpers ──
function computeNext(rule: string, currentDue: string): string | null {
  const [y, m, d] = currentDue.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (rule.includes("FREQ=DAILY")) date.setDate(date.getDate() + 1);
  else if (rule.includes("FREQ=WEEKLY")) date.setDate(date.getDate() + 7);
  else if (rule.includes("FREQ=MONTHLY")) date.setMonth(date.getMonth() + 1);
  else if (rule.includes("FREQ=YEARLY")) date.setFullYear(date.getFullYear() + 1);
  else return null;
  return date.toISOString().split("T")[0];
}

function offsetDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}
