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
    .from("deal_parties")
    .insert({
      deal_id: id,
      role: body.role,
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      company: body.company || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient();
  const url = new URL(req.url);
  const partyId = url.searchParams.get("party_id");

  if (!partyId) {
    return NextResponse.json({ error: "party_id required" }, { status: 400 });
  }

  const { error } = await supabase.from("deal_parties").delete().eq("id", partyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
