import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";

/**
 * GET /api/voice-agent/showings
 * List showings (appointments) for a listing.
 * Query params: listing_id, status, date
 */
export async function GET(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("appointments")
    .select("*")
    .order("start_time", { ascending: true });

  const listingId = params.get("listing_id");
  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  const status = params.get("status");
  if (status) {
    query = query.eq("status", status);
  }

  // Filter by date (match start_time date portion)
  const date = params.get("date");
  if (date) {
    query = query
      .gte("start_time", `${date}T00:00:00`)
      .lt("start_time", `${date}T23:59:59`);
  }

  const limit = params.get("limit");
  query = query.limit(limit ? Number(limit) : 50);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also fetch the listing's showing window for availability context
  let showingWindow = null;
  if (listingId) {
    const { data: listing } = await supabase
      .from("listings")
      .select("showing_window_start, showing_window_end")
      .eq("id", listingId)
      .single();
    if (listing) {
      showingWindow = {
        start: listing.showing_window_start,
        end: listing.showing_window_end,
      };
    }
  }

  return NextResponse.json({
    appointments: data ?? [],
    count: data?.length ?? 0,
    showing_window: showingWindow,
  });
}

/**
 * POST /api/voice-agent/showings
 * Book a tour / create an appointment.
 * Body: { listing_id, buyer_agent_name, buyer_agent_phone, buyer_agent_email?, start_time, end_time, notes? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();

  if (!body.listing_id || !body.buyer_agent_name || !body.buyer_agent_phone || !body.start_time || !body.end_time) {
    return NextResponse.json(
      { error: "listing_id, buyer_agent_name, buyer_agent_phone, start_time, and end_time are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      listing_id: body.listing_id,
      buyer_agent_name: body.buyer_agent_name,
      buyer_agent_phone: body.buyer_agent_phone,
      buyer_agent_email: body.buyer_agent_email || null,
      start_time: body.start_time,
      end_time: body.end_time,
      status: "requested",
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    appointment: data,
    message: `Tour booked for ${body.buyer_agent_name} at ${body.start_time}.`,
  }, { status: 201 });
}
