import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [
    { data: listing },
    { data: activities },
    { data: appointments },
    { data: openHouses },
  ] = await Promise.all([
    supabase.from("listings").select("created_at").eq("id", id).single(),
    supabase.from("listing_activities").select("*").eq("listing_id", id).order("date", { ascending: false }),
    supabase.from("appointments").select("id, status").eq("listing_id", id),
    supabase.from("open_houses").select("id, visitor_count, status").eq("listing_id", id),
  ]);

  const now = new Date();
  const created = listing?.created_at ? new Date(listing.created_at) : now;
  const daysOnMarket = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));

  const acts = activities || [];
  const totalViews = acts.filter((a) => a.activity_type === "view").reduce((s, a) => s + a.count, 0);
  const totalInquiries = acts.filter((a) => a.activity_type === "inquiry").reduce((s, a) => s + a.count, 0);
  const totalOffers = acts.filter((a) => a.activity_type === "offer").length;
  const totalShowings = (appointments || []).length;
  const confirmedShowings = (appointments || []).filter((a) => a.status === "confirmed").length;
  const totalOpenHouses = (openHouses || []).length;
  const completedOpenHouses = (openHouses || []).filter((o) => o.status === "completed").length;
  const totalVisitors = (openHouses || []).reduce((s, o) => s + o.visitor_count, 0);

  return NextResponse.json({
    days_on_market: daysOnMarket,
    total_views: totalViews,
    total_inquiries: totalInquiries,
    total_showings: totalShowings,
    confirmed_showings: confirmedShowings,
    total_offers: totalOffers,
    total_open_houses: totalOpenHouses,
    completed_open_houses: completedOpenHouses,
    total_visitors: totalVisitors,
    activities: acts,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("listing_activities")
    .insert({
      listing_id: id,
      activity_type: body.activity_type,
      date: body.date || new Date().toISOString().split("T")[0],
      count: body.count || 1,
      source: body.source || null,
      amount: body.amount || null,
      description: body.description || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
