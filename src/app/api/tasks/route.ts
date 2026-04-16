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
    .select("*, contacts(name), listings(address)")
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

  return NextResponse.json(data ?? []);
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

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 });
  }

  // If completing, set completed_at
  if (updates.status === "completed") {
    updates.completed_at = new Date().toISOString();
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
  return NextResponse.json({ success: true });
}
