import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("open_houses")
    .select("*, open_house_visitors(count)")
    .eq("listing_id", id)
    .order("date", { ascending: false });

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

  const { data, error } = await supabase
    .from("open_houses")
    .insert({
      listing_id: id,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      type: body.type || "public",
      status: body.status || "scheduled",
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also log as a listing activity
  await supabase.from("listing_activities").insert({
    listing_id: id,
    activity_type: "open_house",
    date: body.date,
    notes: `${body.type || "public"} open house scheduled`,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const body = await req.json();

  if (!body.open_house_id) return NextResponse.json({ error: "open_house_id required" }, { status: 400 });

  const { open_house_id, ...updates } = body;
  const { data, error } = await supabase
    .from("open_houses")
    .update(updates)
    .eq("id", open_house_id)
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
  const ohId = url.searchParams.get("open_house_id");

  if (!ohId) return NextResponse.json({ error: "open_house_id required" }, { status: 400 });

  const { error } = await supabase.from("open_houses").delete().eq("id", ohId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
