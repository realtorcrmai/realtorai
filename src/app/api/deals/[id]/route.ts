import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { id } = await params;

  const [{ data: deal, error }, { data: parties }, { data: checklist }] =
    await Promise.all([
      tc
        .from("deals")
        .select(
          "*, contacts(id, name, phone, email, type), listings(id, address, list_price, status, mls_number)"
        )
        .eq("id", id)
        .single(),
      tc
        .from("deal_parties")
        .select("*")
        .eq("deal_id", id)
        .order("created_at"),
      tc
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
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { id } = await params;
  const body = await req.json();

  // Allowlist of fields that can be updated on deals
  const ALLOWED_FIELDS = [
    "title", "status", "stage", "deal_type", "value", "commission_pct",
    "commission_amount", "contact_id", "listing_id", "expected_close_date",
    "actual_close_date", "notes", "conditions", "deposit_amount",
    "deposit_due_date", "financing_type", "inspection_date",
    "subject_removal_date",
  ];
  const safeUpdate: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) safeUpdate[key] = body[key];
  }

  // Calculate commission_amount if value and commission_pct provided
  if (safeUpdate.value != null && safeUpdate.commission_pct != null) {
    safeUpdate.commission_amount =
      Math.round((safeUpdate.value as number) * ((safeUpdate.commission_pct as number) / 100) * 100) / 100;
  }

  const { data, error } = await tc
    .from("deals")
    .update(safeUpdate)
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
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { id } = await params;

  const { error } = await tc.from("deals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
