import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { taskSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status")?.toLowerCase();
  const priority = searchParams.get("priority")?.toLowerCase();

  let query = tc
    .from("tasks")
    .select("*, contacts(name), listings(address), task_comments(count)")
    .order("created_at", { ascending: false });

  if (status && ["pending", "in_progress", "completed"].includes(status)) {
    query = query.eq("status", status);
  }
  if (priority && ["low", "medium", "high", "urgent"].includes(priority)) {
    query = query.eq("priority", priority);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map task_comments aggregate into comment_count (cast to number — Supabase returns string)
  const tasks = (data ?? []).map((t: Record<string, unknown>) => {
    const commentAgg = t.task_comments as { count: number }[] | undefined;
    const comment_count = Number(commentAgg?.[0]?.count ?? 0);
    const { task_comments: _, ...rest } = t;
    return { ...rest, comment_count };
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();
  const parsed = taskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await tc
    .from("tasks")
    .insert({
      ...parsed.data,
      due_date: parsed.data.due_date || null,
      contact_id: parsed.data.contact_id || null,
      listing_id: parsed.data.listing_id || null,
      description: parsed.data.description || null,
    })
    .select("*, contacts(name), listings(address)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json(data, { status: 201 });
}

// Allowlisted fields for PATCH — prevents overwriting realtor_id, created_at, etc.
const PATCH_ALLOWED = new Set([
  "title", "description", "status", "priority", "category",
  "due_date", "contact_id", "listing_id",
]);

export async function PATCH(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();
  const { id, ...rawUpdates } = body;

  if (!id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 });
  }

  // Only allow known fields
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawUpdates)) {
    if (PATCH_ALLOWED.has(key)) updates[key] = value;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Validate status/priority/category if provided
  if (updates.status && !["pending", "in_progress", "completed"].includes(updates.status as string)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (updates.priority && !["low", "medium", "high", "urgent"].includes(updates.priority as string)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  // If completing, set completed_at
  if (updates.status === "completed") {
    updates.completed_at = new Date().toISOString();
  }
  // If reopening, clear completed_at
  if (updates.status && updates.status !== "completed") {
    updates.completed_at = null;
  }

  const { data, error } = await tc
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*, contacts(name), listings(address)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 });
  }

  const { error } = await tc.from("tasks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return NextResponse.json({ success: true });
}
