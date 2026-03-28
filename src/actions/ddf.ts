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
  lookupBy: "key" | "mls" = "mls"
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

  // 4. Get or create placeholder seller contact
  const sellerId = await getOrCreateImportContact(supabase);

  // 5. Insert listing
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      ...mapped.listing,
      seller_id: sellerId,
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
