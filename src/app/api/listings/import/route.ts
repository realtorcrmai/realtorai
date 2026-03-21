import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Import a listing from MLS Explorer Chrome Extension.
 * Accepts scraped listing data and creates a new listing in the CRM.
 * Auth: X-API-Key header validated against user_integrations table.
 */
export async function POST(req: NextRequest) {
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

  const body = await req.json();

  // Extract known listing fields from scraped data
  const address = body.address || body.street_address || "";
  const mlsNumber = body.mls_number || null;
  const listPrice = body.list_price
    ? parseFloat(String(body.list_price).replace(/[$,]/g, ""))
    : null;

  if (!address) {
    return NextResponse.json(
      { error: "Address is required" },
      { status: 400 }
    );
  }

  // Check for duplicate by MLS number
  if (mlsNumber) {
    const { data: existing } = await supabase
      .from("listings")
      .select("id, address")
      .eq("mls_number", mlsNumber)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Listing with MLS# ${mlsNumber} already exists`, existing_id: existing.id },
        { status: 409 }
      );
    }
  }

  // Create a placeholder contact for the seller (or use a default)
  // For imported listings, we create with a generic seller reference
  // The user can update the seller later in the CRM
  let sellerId: string;

  // Check if there's a default "Imported" contact
  const { data: importContact } = await supabase
    .from("contacts")
    .select("id")
    .eq("name", "MLS Import")
    .maybeSingle();

  if (importContact) {
    sellerId = importContact.id;
  } else {
    // Create a placeholder contact
    const { data: newContact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        name: "MLS Import",
        phone: "000-000-0000",
        type: "seller",
      })
      .select("id")
      .single();

    if (contactError || !newContact) {
      return NextResponse.json(
        { error: "Failed to create placeholder contact" },
        { status: 500 }
      );
    }
    sellerId = newContact.id;
  }

  // Create the listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      address,
      mls_number: mlsNumber,
      list_price: listPrice,
      seller_id: sellerId,
      lockbox_code: body.lockbox_code || "TBD",
      status: "active",
      notes: `Imported from MLS Explorer on ${new Date().toLocaleDateString("en-CA")}`,
    })
    .select()
    .single();

  if (listingError) {
    return NextResponse.json(
      { error: listingError.message },
      { status: 500 }
    );
  }

  // Store additional scraped data as form enrichment data
  const enrichmentFields: Record<string, string> = {};
  const knownKeys = ["address", "street_address", "mls_number", "list_price", "lockbox_code"];

  for (const [key, value] of Object.entries(body)) {
    if (!knownKeys.includes(key) && value) {
      enrichmentFields[key] = String(value);
    }
  }

  if (Object.keys(enrichmentFields).length > 0) {
    await supabase.from("form_submissions").insert({
      listing_id: listing.id,
      form_key: "step-data-enrichment",
      form_data: enrichmentFields,
    });
  }

  return NextResponse.json({
    id: listing.id,
    address: listing.address,
    mls_number: listing.mls_number,
    message: "Listing imported successfully",
  });
}
