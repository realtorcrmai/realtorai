import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
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
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("contact_important_dates")
    .insert({
      contact_id: id,
      family_member_id: body.family_member_id || null,
      date_type: body.date_type,
      date_value: body.date_value,
      label: body.label || null,
      recurring: body.recurring ?? true,
      remind_days_before: body.remind_days_before ?? 7,
      notes: body.notes || null,
    })
    .select("*, contact_family_members(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create reminder task
  if (body.date_value) {
    const contact = await supabase.from("contacts").select("name").eq("id", id).single();
    const contactName = contact.data?.name || "Contact";
    const dateLabel = body.label || body.date_type;
    const remindDays = body.remind_days_before ?? 7;

    const nextOccurrence = getNextOccurrence(body.date_value);
    const reminderDate = new Date(nextOccurrence);
    reminderDate.setDate(reminderDate.getDate() - remindDays);

    if (reminderDate > new Date()) {
      await supabase.from("tasks").insert({
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
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const dateId = url.searchParams.get("date_id");

  if (!dateId) return NextResponse.json({ error: "date_id required" }, { status: 400 });

  const { error } = await supabase.from("contact_important_dates").delete().eq("id", dateId);
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
