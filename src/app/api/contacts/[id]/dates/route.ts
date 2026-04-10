import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createImportantDateSchema = z.object({
  date_type: z.string().min(1).max(100),
  date_value: z.string().min(1),
  label: z.string().max(200).optional(),
  family_member_id: z.string().uuid().optional(),
  recurring: z.boolean().optional(),
  remind_days_before: z.number().int().min(0).max(365).optional(),
  notes: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await tc
    .from("contact_important_dates")
    .select("*, contact_family_members(id, name)")
    .eq("contact_id", id)
    .order("date_value");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const parsed = createImportantDateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await tc
    .from("contact_important_dates")
    .insert({
      contact_id: id,
      family_member_id: parsed.data.family_member_id || null,
      date_type: parsed.data.date_type,
      date_value: parsed.data.date_value,
      label: parsed.data.label || null,
      recurring: parsed.data.recurring ?? true,
      remind_days_before: parsed.data.remind_days_before ?? 7,
      notes: parsed.data.notes || null,
    })
    .select("*, contact_family_members(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create reminder task
  if (parsed.data.date_value) {
    const contact = await tc.from("contacts").select("name").eq("id", id).single();
    const contactName = contact.data?.name || "Contact";
    const dateLabel = parsed.data.label || parsed.data.date_type;
    const remindDays = parsed.data.remind_days_before ?? 7;

    const nextOccurrence = getNextOccurrence(parsed.data.date_value);
    const reminderDate = new Date(nextOccurrence);
    reminderDate.setDate(reminderDate.getDate() - remindDays);

    if (reminderDate > new Date()) {
      await tc.from("tasks").insert({
        title: `${dateLabel} reminder - ${contactName}`,
        description: `${contactName}'s ${dateLabel} is on ${nextOccurrence}. Plan a greeting or gift.`,
        status: "pending",
        priority: "medium",
        category: "follow_up",
        due_date: reminderDate.toISOString().split("T")[0],
        contact_id: id,
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  let tc;
  try {
    tc = await getAuthenticatedTenantClient();
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dateId = url.searchParams.get("date_id");

  if (!dateId) return NextResponse.json({ error: "date_id required" }, { status: 400 });

  const { error } = await tc.from("contact_important_dates").delete().eq("id", dateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function getNextOccurrence(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (thisYear >= now) return thisYear.toISOString().split("T")[0];
  const nextYear = new Date(now.getFullYear() + 1, date.getMonth(), date.getDate());
  return nextYear.toISOString().split("T")[0];
}
