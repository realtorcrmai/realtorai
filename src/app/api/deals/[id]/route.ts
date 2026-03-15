import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: deal, error }, { data: parties }, { data: checklist }] =
    await Promise.all([
      supabase
        .from("deals")
        .select(
          "*, contacts(id, name, phone, email, type), listings(id, address, list_price, status, mls_number)"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("deal_parties")
        .select("*")
        .eq("deal_id", id)
        .order("created_at"),
      supabase
        .from("deal_checklist")
        .select("*")
        .eq("deal_id", id)
        .order("sort_order"),
    ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ ...deal, parties: parties ?? [], checklist: checklist ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await req.json();

  // Calculate commission_amount if value and commission_pct provided
  if (body.value != null && body.commission_pct != null) {
    body.commission_amount =
      Math.round(body.value * (body.commission_pct / 100) * 100) / 100;
  }

  const { data, error } = await supabase
    .from("deals")
    .update(body)
    .eq("id", id)
    .select("*, contacts(id, name, phone, email, type), listings(id, address, list_price, status)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
