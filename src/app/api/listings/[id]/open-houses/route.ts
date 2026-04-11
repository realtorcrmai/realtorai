import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createOpenHouseSchema = z.object({
  date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  type: z.enum(["public", "agent", "virtual"]).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.end_time > data.start_time,
  { message: "end_time must be after start_time", path: ["end_time"] }
);

const patchOpenHouseSchema = z.object({
  open_house_id: z.string().uuid(),
  date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  type: z.enum(["public", "agent", "virtual"]).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.start_time && data.end_time) {
      return data.end_time > data.start_time;
    }
    return true;
  },
  { message: "end_time must be after start_time", path: ["end_time"] }
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
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const { id } = await params;
  const body = await req.json();

  const parsed = createOpenHouseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await tc
    .from("open_houses")
    .insert({
      listing_id: id,
      date: parsed.data.date,
      start_time: parsed.data.start_time,
      end_time: parsed.data.end_time,
      type: parsed.data.type || "public",
      status: parsed.data.status || "scheduled",
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also log as a listing activity
  await tc.from("listing_activities").insert({
    listing_id: id,
    activity_type: "open_house",
    date: parsed.data.date,
    notes: `${parsed.data.type || "public"} open house scheduled`,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const body = await req.json();

  const parsed = patchOpenHouseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { open_house_id, ...updates } = parsed.data;
  const { data, error } = await tc
    .from("open_houses")
    .update(updates)
    .eq("id", open_house_id)
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
  const ohId = url.searchParams.get("open_house_id");

  if (!ohId) return NextResponse.json({ error: "open_house_id required" }, { status: 400 });

  const { error } = await tc.from("open_houses").delete().eq("id", ohId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
