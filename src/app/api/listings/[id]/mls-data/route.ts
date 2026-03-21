import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * MLS Data endpoint for the Chrome Extension.
 * Returns aggregated data from ALL workflow steps + listing metadata for MLS form filling.
 * Auth: X-API-Key header validated against user_integrations table.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "X-API-Key header is required" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  // Validate API key against user_integrations (provider=mls_extension, key stored in config JSONB)
  const { data: integrations } = await supabase
    .from("user_integrations")
    .select("id, config")
    .eq("provider", "mls_extension");

  const integration = integrations?.find(
    (row) => (row.config as Record<string, string>)?.api_key === apiKey
  );

  if (!integration) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }

  // Fetch listing with seller contact
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*, contacts(name, phone, email)")
    .eq("id", id)
    .single();

  if (listingError || !listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  const seller = (listing as Record<string, unknown>).contacts as {
    name: string;
    phone: string;
    email: string | null;
  } | null;

  // Fetch ALL step form_submissions to aggregate data from Steps 1-7
  const { data: formSubmissions } = await supabase
    .from("form_submissions")
    .select("form_key, form_data")
    .eq("listing_id", id)
    .in("form_key", [
      "step-seller-intake",
      "step-data-enrichment",
      "step-cma",
      "step-pricing-review",
      "step-form-generation",
      "step-e-signature",
      "step-mls-prep",
    ]);

  // Merge all step data — later steps take priority
  const aggregated: Record<string, unknown> = {};
  const stepOrder = [
    "step-seller-intake",
    "step-data-enrichment",
    "step-cma",
    "step-pricing-review",
    "step-form-generation",
    "step-e-signature",
    "step-mls-prep",
  ];

  for (const stepKey of stepOrder) {
    const submission = formSubmissions?.find((s) => s.form_key === stepKey);
    if (submission?.form_data) {
      const data = submission.form_data as Record<string, unknown>;
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== "") {
          aggregated[key] = value;
        }
      }
    }
  }

  // Build flat MLS-ready response
  const mlsData = {
    // Listing basics
    address: listing.address,
    list_price: listing.list_price,
    mls_number: listing.mls_number,
    status: listing.status,
    lockbox_code: listing.lockbox_code,

    // Seller info
    seller_name: seller?.name ?? "",
    seller_phone: seller?.phone ?? "",
    seller_email: seller?.email ?? "",

    // All aggregated step fields (flattened)
    ...aggregated,
  };

  return NextResponse.json(mlsData);
}
