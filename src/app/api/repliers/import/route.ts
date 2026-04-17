import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

/**
 * Import a single Repliers listing into the CRM.
 * Auto-creates a placeholder seller contact if needed.
 */
export async function POST(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { mlsNumber, address, listPrice, propertyType, description } = body;

  if (!address || address.length < 5) {
    return NextResponse.json(
      { error: "Address is required (min 5 characters)" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

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

  // Get or create placeholder seller contact
  let sellerId: string;

  const { data: importContact } = await supabase
    .from("contacts")
    .select("id")
    .eq("name", "MLS Import")
    .maybeSingle();

  if (importContact) {
    sellerId = importContact.id;
  } else {
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

  // Map Repliers property class to our property_type enum
  const typeMap: Record<string, string> = {
    ResidentialProperty: "Residential",
    CondoProperty: "Condo/Apartment",
    CommercialProperty: "Commercial",
  };
  const mappedType = typeMap[body.class] ?? "Residential";

  // Create the listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      address,
      mls_number: mlsNumber || null,
      list_price: listPrice ?? null,
      seller_id: sellerId,
      lockbox_code: "TBD",
      status: "active",
      property_type: mappedType,
      notes: description
        ? `Imported from Repliers on ${new Date().toLocaleDateString("en-CA")}\n\n${description.slice(0, 500)}`
        : `Imported from Repliers on ${new Date().toLocaleDateString("en-CA")}`,
    })
    .select()
    .single();

  if (listingError) {
    return NextResponse.json(
      { error: listingError.message },
      { status: 500 }
    );
  }

  // Store enrichment data (beds, baths, sqft, images, etc.)
  const enrichment: Record<string, string> = {};
  if (body.bedrooms) enrichment.bedrooms = String(body.bedrooms);
  if (body.bathrooms) enrichment.bathrooms = String(body.bathrooms);
  if (body.sqft) enrichment.sqft = String(body.sqft);
  if (body.yearBuilt) enrichment.yearBuilt = String(body.yearBuilt);
  if (body.lat) enrichment.latitude = String(body.lat);
  if (body.lng) enrichment.longitude = String(body.lng);
  if (body.images?.length) enrichment.repliers_images = JSON.stringify(body.images.slice(0, 10));

  if (Object.keys(enrichment).length > 0) {
    await supabase.from("form_submissions").insert({
      listing_id: listing.id,
      form_key: "step-data-enrichment",
      form_data: enrichment,
    });
  }

  return NextResponse.json({
    id: listing.id,
    address: listing.address,
    mls_number: listing.mls_number,
    message: "Listing imported successfully",
  }, { status: 201 });
}
