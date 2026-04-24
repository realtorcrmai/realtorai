"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  searchProperties,
  getPropertyByMLS,
  getPropertyByKey,
  getMember,
  getOffice,
  countProperties,
} from "@/lib/ddf";
import { mapDDFToListing } from "@/lib/ddf/mapper";
import type { DDFSearchParams } from "@/types/ddf";

// ─── Preview a DDF listing (read-only, no database writes) ──

function extractMLSNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // If it looks like a plain MLS number (e.g. R2901234, V1234567), return it directly
  if (/^[A-Z]?\d{5,10}$/i.test(trimmed)) return trimmed.toUpperCase();

  // realtor.ca URL formats:
  //   https://www.realtor.ca/real-estate/12345678/...
  //   https://www.realtor.ca/real-estate/27924346/123-street-city-province-postal
  const realtorMatch = trimmed.match(/realtor\.ca\/real-estate\/(\d+)/i);
  if (realtorMatch) return realtorMatch[1];

  // Board-specific or generic URL with MLS number in path or query
  const mlsParamMatch = trimmed.match(/[?&](?:mls|mlsNumber|listingId)=([A-Z0-9]+)/i);
  if (mlsParamMatch) return mlsParamMatch[1].toUpperCase();

  // Try to find an MLS-like pattern in the URL path (letter + digits)
  const pathMatch = trimmed.match(/\/([A-Z]\d{6,9})\b/i);
  if (pathMatch) return pathMatch[1].toUpperCase();

  // Last resort: if it contains only alphanumeric and is 6-10 chars, treat as MLS number
  if (/^[A-Z0-9]{6,10}$/i.test(trimmed)) return trimmed.toUpperCase();

  return null;
}

export async function previewDDFListing(input: string) {
  const mlsNumber = extractMLSNumber(input);
  if (!mlsNumber) {
    return { error: "Could not extract an MLS number from the provided input. Enter an MLS number (e.g. R2901234) or paste a realtor.ca listing URL." };
  }

  try {
    const property = await getPropertyByMLS(mlsNumber);
    if (!property) {
      return { error: `No listing found for MLS# ${mlsNumber} in the DDF database.` };
    }

    const mapped = mapDDFToListing(property);
    const media = property.Media ?? [];
    const photos = media
      .filter((m) => m.MediaCategory === "Property Photo")
      .slice(0, 6)
      .map((m) => m.MediaURL);

    return {
      success: true,
      mlsNumber: property.ListingId,
      listingKey: property.ListingKey,
      address: property.UnparsedAddress,
      city: property.City,
      province: property.StateOrProvince,
      postalCode: property.PostalCode,
      listPrice: property.ListPrice,
      propertyType: mapped.listing.property_type,
      status: mapped.listing.status,
      bedrooms: property.BedroomsTotal,
      bathrooms: property.BathroomsTotalInteger,
      sqft: property.LivingArea,
      yearBuilt: property.YearBuilt,
      lotSize: property.LotSizeDimensions,
      description: property.PublicRemarks,
      heroImage: mapped.listing.hero_image_url,
      photos,
      photoCount: property.PhotosCount ?? 0,
      listingUrl: property.ListingURL,
    };
  } catch (err) {
    return { error: `Failed to fetch listing data: ${String(err)}` };
  }
}

// ─── Search DDF listings (no writes) ──────────────────

export async function searchDDFListings(params: DDFSearchParams) {
  try {
    const res = await searchProperties(params);
    // Return lightweight summaries, not full records
    const results = res.value.map((p) => ({
      listingKey: p.ListingKey,
      listingId: p.ListingId,
      address: p.UnparsedAddress,
      city: p.City,
      province: p.StateOrProvince,
      postalCode: p.PostalCode,
      listPrice: p.ListPrice,
      bedrooms: p.BedroomsTotal,
      bathrooms: p.BathroomsTotalInteger,
      livingArea: p.LivingArea,
      livingAreaUnits: p.LivingAreaUnits,
      propertySubType: p.PropertySubType,
      status: p.StandardStatus,
      photosCount: p.PhotosCount,
      heroImage: p.Media?.find((m) => m.PreferredPhotoYN)?.MediaURL
        ?? p.Media?.[0]?.MediaURL
        ?? null,
      modifiedAt: p.ModificationTimestamp,
      listingUrl: p.ListingURL,
    }));

    return {
      success: true,
      results,
      count: res["@odata.count"] ?? null,
      nextLink: res["@odata.nextLink"] ?? null,
    };
  } catch (err) {
    return { error: String(err) };
  }
}

// ─── Count DDF listings ───────────────────────────────

export async function countDDFListings(
  params: Omit<DDFSearchParams, "top" | "skip" | "orderBy" | "count">
) {
  try {
    const count = await countProperties(params);
    return { success: true, count };
  } catch (err) {
    return { error: String(err) };
  }
}

// ─── Import a single DDF listing into CRM ─────────────

export async function importDDFListing(
  listingKeyOrMLS: string,
  lookupBy: "key" | "mls" = "mls",
  options?: { seller_id?: string; lockbox_code?: string }
) {
  const supabase = createAdminClient();

  // 1. Fetch property from DDF
  const property =
    lookupBy === "key"
      ? await getPropertyByKey(listingKeyOrMLS)
      : await getPropertyByMLS(listingKeyOrMLS);

  if (!property) {
    return { error: `Property not found in DDF: ${listingKeyOrMLS}` };
  }

  // 2. Check for duplicate by MLS number
  const { data: existing } = await supabase
    .from("listings")
    .select("id, address, mls_number")
    .eq("mls_number", property.ListingId)
    .maybeSingle();

  if (existing) {
    return {
      error: `Listing with MLS# ${property.ListingId} already exists`,
      existing_id: existing.id,
      existing_address: existing.address,
    };
  }

  // 3. Map DDF → CRM
  const mapped = mapDDFToListing(property);

  // 4. Get seller: use provided seller_id or create placeholder
  const sellerId = options?.seller_id || await getOrCreateImportContact(supabase);

  // 5. Insert listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      ...mapped.listing,
      seller_id: sellerId,
      ...(options?.lockbox_code ? { lockbox_code: options.lockbox_code } : {}),
    })
    .select("id, address, mls_number")
    .single();

  if (listingError || !listing) {
    return { error: `Failed to create listing: ${listingError?.message}` };
  }

  // 6. Insert enrichment form_submission
  if (Object.keys(mapped.enrichment).length > 0) {
    const { error: enrichError } = await supabase
      .from("form_submissions")
      .insert({
        listing_id: listing.id,
        form_key: "step-data-enrichment",
        form_data: mapped.enrichment,
        status: "draft",
      });

    if (enrichError) {
      console.error("DDF enrichment insert failed:", enrichError.message);
    }
  }

  // 7. Insert MLS prep form_submission (public remarks + photo count)
  if (mapped.mlsPrep.property_description) {
    const { error: mlsError } = await supabase
      .from("form_submissions")
      .insert({
        listing_id: listing.id,
        form_key: "step-mls-prep",
        form_data: mapped.mlsPrep,
        status: "draft",
      });

    if (mlsError) {
      console.error("DDF MLS prep insert failed:", mlsError.message);
    }
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${listing.id}`);

  return {
    success: true,
    id: listing.id,
    address: listing.address,
    mls_number: listing.mls_number,
    enrichment_fields: Object.keys(mapped.enrichment).length,
  };
}

// ─── Sync: re-pull DDF data for an existing listing ───

export async function syncDDFListing(listingId: string) {
  const supabase = createAdminClient();

  // 1. Get existing listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id, mls_number")
    .eq("id", listingId)
    .single();

  if (!listing?.mls_number) {
    return { error: "Listing not found or has no MLS number" };
  }

  // 2. Fetch from DDF
  const property = await getPropertyByMLS(listing.mls_number);
  if (!property) {
    return { error: `MLS# ${listing.mls_number} not found in DDF` };
  }

  // 3. Map
  const mapped = mapDDFToListing(property);

  // 4. Update listing (only price, status, hero image — don't overwrite address/seller)
  const { error: updateError } = await supabase
    .from("listings")
    .update({
      list_price: mapped.listing.list_price,
      status: mapped.listing.status,
      hero_image_url: mapped.listing.hero_image_url,
      property_type: mapped.listing.property_type,
    })
    .eq("id", listingId);

  if (updateError) {
    return { error: `Failed to update listing: ${updateError.message}` };
  }

  // 5. Merge enrichment: fetch existing, merge (DDF overwrites), upsert
  const { data: existingEnrich } = await supabase
    .from("form_submissions")
    .select("id, form_data")
    .eq("listing_id", listingId)
    .eq("form_key", "step-data-enrichment")
    .maybeSingle();

  const mergedEnrichment = {
    ...(existingEnrich?.form_data as Record<string, unknown> ?? {}),
    ...mapped.enrichment,
  };

  if (existingEnrich) {
    await supabase
      .from("form_submissions")
      .update({ form_data: mergedEnrichment })
      .eq("id", existingEnrich.id);
  } else {
    await supabase.from("form_submissions").insert({
      listing_id: listingId,
      form_key: "step-data-enrichment",
      form_data: mergedEnrichment,
      status: "draft",
    });
  }

  // 6. Merge MLS prep
  if (mapped.mlsPrep.property_description) {
    const { data: existingMls } = await supabase
      .from("form_submissions")
      .select("id, form_data")
      .eq("listing_id", listingId)
      .eq("form_key", "step-mls-prep")
      .maybeSingle();

    const mergedMls = {
      ...(existingMls?.form_data as Record<string, unknown> ?? {}),
      ...mapped.mlsPrep,
    };

    if (existingMls) {
      await supabase
        .from("form_submissions")
        .update({ form_data: mergedMls })
        .eq("id", existingMls.id);
    } else {
      await supabase.from("form_submissions").insert({
        listing_id: listingId,
        form_key: "step-mls-prep",
        form_data: mergedMls,
        status: "draft",
      });
    }
  }

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");

  return {
    success: true,
    id: listingId,
    fields_updated: Object.keys(mapped.enrichment).length,
    mls_number: listing.mls_number,
  };
}

// ─── Lookup DDF agent + office for a listing ──────────

export async function lookupDDFAgent(listingId: string) {
  const supabase = createAdminClient();

  // Get enrichment form_data to find DDF keys
  const { data: enrichment } = await supabase
    .from("form_submissions")
    .select("form_data")
    .eq("listing_id", listingId)
    .eq("form_key", "step-data-enrichment")
    .maybeSingle();

  const formData = enrichment?.form_data as Record<string, string> | null;
  const agentKey = formData?.ddf_list_agent_key;
  const officeKey = formData?.ddf_list_office_key;

  if (!agentKey) {
    return { error: "No DDF agent key found for this listing" };
  }

  try {
    const [agent, office] = await Promise.all([
      getMember(agentKey),
      officeKey ? getOffice(officeKey) : null,
    ]);

    return {
      success: true,
      agent: agent
        ? {
            name: `${agent.MemberFirstName} ${agent.MemberLastName}`,
            mlsId: agent.MemberMlsId,
            nationalId: agent.MemberNationalAssociationId,
          }
        : null,
      office: office
        ? {
            name: office.OfficeName,
            phone: office.OfficePhone,
            city: office.OfficeCity,
          }
        : null,
    };
  } catch (err) {
    return { error: String(err) };
  }
}

// ─── Helper: get or create "DDF Import" placeholder ───

async function getOrCreateImportContact(
  supabase: ReturnType<typeof createAdminClient>
): Promise<string> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("name", "DDF Import")
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("contacts")
    .insert({
      name: "DDF Import",
      phone: "000-000-0000",
      type: "seller",
      notes: "Placeholder contact for DDF-imported listings. Update with actual seller details.",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create DDF import contact: ${error?.message}`);
  }

  return created.id;
}
