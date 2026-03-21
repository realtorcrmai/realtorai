import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const address = req.nextUrl.searchParams.get("address");
  const listingId = req.nextUrl.searchParams.get("listingId");

  if (!address) {
    return NextResponse.json(
      { error: "address parameter is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Find previous listings at the same address (case-insensitive), excluding current
  let query = supabase
    .from("listings")
    .select("id")
    .ilike("address", address)
    .order("created_at", { ascending: false })
    .limit(1);

  if (listingId) {
    query = query.neq("id", listingId);
  }

  const { data: previousListings, error: listingError } = await query;

  if (listingError) {
    return NextResponse.json(
      { error: listingError.message },
      { status: 500 }
    );
  }

  if (!previousListings || previousListings.length === 0) {
    return NextResponse.json({ data: null });
  }

  // Fetch the data-enrichment form submission for the previous listing
  const { data: formSubmission, error: formError } = await supabase
    .from("form_submissions")
    .select("form_data")
    .eq("listing_id", previousListings[0].id)
    .eq("form_key", "step-data-enrichment")
    .single();

  if (formError || !formSubmission) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({
    data: formSubmission.form_data,
    source_listing_id: previousListings[0].id,
  });
}
