import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createPartySchema = z.object({
  role: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  company: z.string().max(200).optional(),
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

  const parsed = createPartySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await tc
    .from("deal_parties")
    .insert({
      deal_id: id,
      role: parsed.data.role,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      company: parsed.data.company || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const url = new URL(req.url);
  const partyId = url.searchParams.get("party_id");

  if (!partyId) {
    return NextResponse.json({ error: "party_id required" }, { status: 400 });
  }

  const { error } = await tc.from("deal_parties").delete().eq("id", partyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
