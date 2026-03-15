import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("mortgages")
    .select("*")
    .eq("deal_id", id)
    .order("created_at", { ascending: false });

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
    .from("mortgages")
    .insert({
      deal_id: id,
      contact_id: body.contact_id || null,
      lender_name: body.lender_name,
      mortgage_amount: body.mortgage_amount || null,
      interest_rate: body.interest_rate || null,
      mortgage_type: body.mortgage_type || "fixed",
      term_months: body.term_months || null,
      amortization_years: body.amortization_years || null,
      start_date: body.start_date || null,
      renewal_date: body.renewal_date || null,
      monthly_payment: body.monthly_payment || null,
      lender_contact: body.lender_contact || null,
      lender_phone: body.lender_phone || null,
      lender_email: body.lender_email || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create renewal task if renewal_date is set
  if (body.renewal_date) {
    await createRenewalTask(supabase, id, body.contact_id, body.lender_name, body.renewal_date);
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  if (!body.mortgage_id) {
    return NextResponse.json({ error: "mortgage_id required" }, { status: 400 });
  }

  const { mortgage_id, ...updates } = body;

  const { data, error } = await supabase
    .from("mortgages")
    .update(updates)
    .eq("id", mortgage_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const mortgageId = url.searchParams.get("mortgage_id");

  if (!mortgageId) {
    return NextResponse.json({ error: "mortgage_id required" }, { status: 400 });
  }

  const { error } = await supabase.from("mortgages").delete().eq("id", mortgageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

async function createRenewalTask(
  supabase: ReturnType<typeof createAdminClient>,
  dealId: string,
  contactId: string | null,
  lenderName: string,
  renewalDate: string
) {
  // Create a task 90 days before renewal date to remind realtor
  const renewal = new Date(renewalDate);
  const reminder = new Date(renewal);
  reminder.setDate(reminder.getDate() - 90);

  // Only create if reminder is in the future
  if (reminder > new Date()) {
    // Get deal info for task title
    const { data: deal } = await supabase
      .from("deals")
      .select("title, contact_id")
      .eq("id", dealId)
      .single();

    await supabase.from("tasks").insert({
      title: `Mortgage renewal reminder - ${deal?.title || "Deal"}`,
      description: `Mortgage with ${lenderName} renews on ${renewalDate}. Contact buyer 90 days before to discuss renewal options.`,
      status: "pending",
      priority: "high",
      category: "follow_up",
      due_date: reminder.toISOString().split("T")[0],
      contact_id: contactId || deal?.contact_id || null,
    });
  }
}
