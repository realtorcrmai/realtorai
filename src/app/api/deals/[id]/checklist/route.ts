import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createChecklistItemSchema = z.object({
  item: z.string().min(1).max(500),
  due_date: z.string().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { id } = await params;
  const body = await req.json();

  const parsed = createChecklistItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await tc
    .from("deal_checklist")
    .insert({ deal_id: id, item: parsed.data.item, due_date: parsed.data.due_date || null, sort_order: parsed.data.sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { id } = await params;
  void id; // deal_id context
  const body = await req.json();

  const patchChecklistSchema = z.object({
    checklist_id: z.string().uuid(),
    completed: z.boolean().optional(),
    item: z.string().min(1).max(500).optional(),
    due_date: z.string().optional(),
  });

  const parsed = patchChecklistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.completed !== undefined) {
    update.completed = parsed.data.completed;
    update.completed_at = parsed.data.completed ? new Date().toISOString() : null;
  }
  if (parsed.data.item !== undefined) update.item = parsed.data.item;
  if (parsed.data.due_date !== undefined) update.due_date = parsed.data.due_date;

  const { data, error } = await tc
    .from("deal_checklist")
    .update(update)
    .eq("id", parsed.data.checklist_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
