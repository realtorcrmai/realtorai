import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const mortgageSchema = z.object({
  lender_name: z.string().min(1).max(200),
  contact_id: z.string().uuid().optional(),
  mortgage_amount: z.number().positive().optional(),
  interest_rate: z.number().min(0).max(100).optional(),
  mortgage_type: z.enum(["fixed", "variable", "hybrid"]).optional(),
  term_months: z.number().int().positive().optional(),
  amortization_years: z.number().int().positive().optional(),
  start_date: z.string().optional(),
  renewal_date: z.string().optional(),
  monthly_payment: z.number().positive().optional(),
  lender_contact: z.string().max(200).optional(),
  lender_phone: z.string().max(30).optional(),
  lender_email: z.string().email().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.start_date && data.renewal_date) {
      return new Date(data.renewal_date) > new Date(data.start_date);
    }
    return true;
  },
  { message: "renewal_date must be after start_date", path: ["renewal_date"] }
);

const patchMortgageSchema = z.object({
  mortgage_id: z.string().uuid(),
  lender_name: z.string().min(1).max(200).optional(),
  contact_id: z.string().uuid().optional(),
  mortgage_amount: z.number().positive().optional(),
  interest_rate: z.number().min(0).max(100).optional(),
  mortgage_type: z.enum(["fixed", "variable", "hybrid"]).optional(),
  term_months: z.number().int().positive().optional(),
  amortization_years: z.number().int().positive().optional(),
  start_date: z.string().optional(),
  renewal_date: z.string().optional(),
  monthly_payment: z.number().positive().optional(),
  lender_contact: z.string().max(200).optional(),
  lender_phone: z.string().max(30).optional(),
  lender_email: z.string().email().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.start_date && data.renewal_date) {
      return new Date(data.renewal_date) > new Date(data.start_date);
    }
    return true;
  },
  { message: "renewal_date must be after start_date", path: ["renewal_date"] }
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

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
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const supabase = createAdminClient();
  const body = await req.json();

  const parsed = mortgageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

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
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const body = await req.json();

  const parsed = patchMortgageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { mortgage_id, ...updates } = parsed.data;

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
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

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
