import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("deal_checklist")
    .insert({ deal_id: id, item: body.item, due_date: body.due_date || null, sort_order: body.sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  void id; // deal_id context
  const supabase = createAdminClient();
  const body = await req.json();

  if (!body.checklist_id) {
    return NextResponse.json({ error: "checklist_id required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.completed !== undefined) {
    update.completed = body.completed;
    update.completed_at = body.completed ? new Date().toISOString() : null;
  }
  if (body.item !== undefined) update.item = body.item;
  if (body.due_date !== undefined) update.due_date = body.due_date;

  const { data, error } = await supabase
    .from("deal_checklist")
    .update(update)
    .eq("id", body.checklist_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
