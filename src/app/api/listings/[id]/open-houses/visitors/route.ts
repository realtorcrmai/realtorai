import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const url = new URL(req.url);
  const ohId = url.searchParams.get("open_house_id");

  if (!ohId) return NextResponse.json({ error: "open_house_id required" }, { status: 400 });

  const { data, error } = await tc
    .from("open_house_visitors")
    .select("*")
    .eq("open_house_id", ohId)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();

  if (!body.open_house_id) return NextResponse.json({ error: "open_house_id required" }, { status: 400 });

  const { data, error } = await tc
    .from("open_house_visitors")
    .insert({
      open_house_id: body.open_house_id,
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      agent_name: body.agent_name || null,
      interest_level: body.interest_level || null,
      feedback: body.feedback || null,
      wants_followup: body.wants_followup || false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update visitor count on open house
  const { data: visitors } = await tc
    .from("open_house_visitors")
    .select("id", { count: "exact" })
    .eq("open_house_id", body.open_house_id);

  await tc
    .from("open_houses")
    .update({ visitor_count: visitors?.length || 0 })
    .eq("id", body.open_house_id);

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const url = new URL(req.url);
  const visitorId = url.searchParams.get("visitor_id");

  if (!visitorId) return NextResponse.json({ error: "visitor_id required" }, { status: 400 });

  // Get open_house_id before deleting
  const { data: visitor } = await tc
    .from("open_house_visitors")
    .select("open_house_id")
    .eq("id", visitorId)
    .single();

  const { error } = await tc.from("open_house_visitors").delete().eq("id", visitorId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update visitor count
  if (visitor) {
    const { data: visitors } = await tc
      .from("open_house_visitors")
      .select("id", { count: "exact" })
      .eq("open_house_id", visitor.open_house_id);

    await tc
      .from("open_houses")
      .update({ visitor_count: visitors?.length || 0 })
      .eq("id", visitor.open_house_id);
  }

  return NextResponse.json({ success: true });
}
