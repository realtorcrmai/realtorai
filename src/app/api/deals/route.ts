import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");

  let query = supabase
    .from("deals")
    .select("*, contacts(id, name, phone, email, type), listings(id, address, list_price, status)")
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      title: body.title,
      type: body.type,
      stage: body.stage || "new_lead",
      status: body.status || "active",
      contact_id: body.contact_id || null,
      listing_id: body.listing_id || null,
      value: body.value || null,
      commission_pct: body.commission_pct || null,
      commission_amount: body.commission_amount || null,
      close_date: body.close_date || null,
      possession_date: body.possession_date || null,
      subject_removal_date: body.subject_removal_date || null,
      notes: body.notes || null,
    })
    .select("*, contacts(id, name, phone, email, type), listings(id, address, list_price, status)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create default checklist items if requested
  if (body.create_checklist) {
    const { DEFAULT_BUYER_CHECKLIST, DEFAULT_SELLER_CHECKLIST } = await import(
      "@/lib/constants/pipeline"
    );
    const items =
      body.type === "buyer" ? DEFAULT_BUYER_CHECKLIST : DEFAULT_SELLER_CHECKLIST;
    await supabase.from("deal_checklist").insert(
      items.map((item: string, i: number) => ({
        deal_id: deal.id,
        item,
        sort_order: i,
      }))
    );
  }

  return NextResponse.json(deal, { status: 201 });
}
