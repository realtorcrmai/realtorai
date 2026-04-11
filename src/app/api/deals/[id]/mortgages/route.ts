import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";
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
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { id } = await params;

  const { data, error } = await tc
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
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { id } = await params;
  const body = await req.json();

  const parsed = mortgageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await tc
    .from("mortgages")
    .insert({
      deal_id: id,
      contact_id: parsed.data.contact_id || null,
      lender_name: parsed.data.lender_name,
      mortgage_amount: parsed.data.mortgage_amount || null,
      interest_rate: parsed.data.interest_rate || null,
      mortgage_type: parsed.data.mortgage_type || "fixed",
      term_months: parsed.data.term_months || null,
      amortization_years: parsed.data.amortization_years || null,
      start_date: parsed.data.start_date || null,
      renewal_date: parsed.data.renewal_date || null,
      monthly_payment: parsed.data.monthly_payment || null,
      lender_contact: parsed.data.lender_contact || null,
      lender_phone: parsed.data.lender_phone || null,
      lender_email: parsed.data.lender_email || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create renewal task if renewal_date is set
  if (parsed.data.renewal_date) {
    const renewal = new Date(parsed.data.renewal_date);
    const reminder = new Date(renewal);
    reminder.setDate(reminder.getDate() - 90);

    if (reminder > new Date()) {
      const { data: deal } = await tc
        .from("deals")
        .select("title, contact_id")
        .eq("id", id)
        .single();

      await tc.from("tasks").insert({
        title: `Mortgage renewal reminder - ${deal?.title || "Deal"}`,
        description: `Mortgage with ${parsed.data.lender_name} renews on ${parsed.data.renewal_date}. Contact buyer 90 days before to discuss renewal options.`,
        status: "pending",
        priority: "high",
        category: "follow_up",
        due_date: reminder.toISOString().split("T")[0],
        contact_id: parsed.data.contact_id || deal?.contact_id || null,
      });
    }
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();

  const parsed = patchMortgageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { mortgage_id, ...updates } = parsed.data;

  const { data, error } = await tc
    .from("mortgages")
    .update(updates)
    .eq("id", mortgage_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const url = new URL(req.url);
  const mortgageId = url.searchParams.get("mortgage_id");

  if (!mortgageId) {
    return NextResponse.json({ error: "mortgage_id required" }, { status: 400 });
  }

  const { error } = await tc.from("mortgages").delete().eq("id", mortgageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
