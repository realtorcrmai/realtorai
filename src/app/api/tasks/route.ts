import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status")?.toLowerCase();
  const priority = searchParams.get("priority")?.toLowerCase();

  let query = supabase
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

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  category: z
    .enum([
      "follow_up",
      "showing",
      "document",
      "listing",
      "marketing",
      "inspection",
      "closing",
      "general",
    ])
    .default("general"),
  due_date: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

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
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // If completing, set completed_at
  if (updates.status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select("*, contacts(name), listings(address)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
