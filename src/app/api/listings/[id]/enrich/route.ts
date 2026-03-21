import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/listings/[id]/enrich
 * Extension sends scraped data from a previous MLS listing to merge
 * into an existing listing's data-enrichment form_submission.
 * Auth: X-API-Key header.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "X-API-Key header is required" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  // Validate API key
  const { data: integrations } = await supabase
    .from("user_integrations")
    .select("id, config")
    .eq("provider", "mls_extension");

  const integration = integrations?.find(
    (row) => (row.config as Record<string, string>)?.api_key === apiKey
  );

  if (!integration) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const scrapedData = body.data || body;

  // Verify listing exists
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id")
    .eq("id", id)
    .single();

  if (listingError || !listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  // Fetch existing enrichment data (if any)
  const { data: existing } = await supabase
    .from("form_submissions")
    .select("form_data")
    .eq("listing_id", id)
    .eq("form_key", "step-data-enrichment")
    .single();

  const existingData = (existing?.form_data ?? {}) as Record<string, unknown>;

  // Merge: scraped values fill in gaps, existing values preserved
  const merged: Record<string, unknown> = { ...existingData };
  let enrichedCount = 0;

  for (const [key, value] of Object.entries(scrapedData)) {
    if (value === null || value === undefined || value === "") continue;
    // Only fill if key doesn't exist or is empty
    if (!merged[key] || merged[key] === "" || merged[key] === null) {
      merged[key] = value;
      enrichedCount++;
    }
  }

  // Upsert enrichment data
  const { error: upsertError } = await supabase
    .from("form_submissions")
    .upsert(
      {
        listing_id: id,
        form_key: "step-data-enrichment",
        form_data: merged,
        status: "draft" as const,
      },
      { onConflict: "listing_id,form_key" }
    );

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    enriched_fields: enrichedCount,
    listing_id: id,
  });
}
