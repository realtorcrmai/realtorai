"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

export async function generateAndSaveMLSRemarks(listingId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { data: listing } = await tc
    .from("listings")
    .select("address, list_price, notes, bedrooms, bathrooms, total_sqft, year_built, features, showing_window_start, showing_window_end")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found" };

  try {
    const { generateMLSRemarks } = await import("@/lib/anthropic/creative-director");

    const remarks = await generateMLSRemarks({
      address: listing.address,
      listPrice: listing.list_price,
      notes: listing.notes,
      bedrooms: listing.bedrooms ?? undefined,
      bathrooms: listing.bathrooms ?? undefined,
      sqft: listing.total_sqft ?? undefined,
      yearBuilt: listing.year_built ?? undefined,
      features: (listing.features ?? []).join(", ") || undefined,
      showingInstructions: listing.showing_window_start && listing.showing_window_end
        ? `Showings ${listing.showing_window_start}–${listing.showing_window_end}`
        : undefined,
    });

    await tc.from("listings").update({
      mls_remarks: remarks.publicRemarks,
      mls_realtor_remarks: remarks.realtorRemarks,
    }).eq("id", listingId);

    revalidatePath(`/listings/${listingId}`);
    return { success: true, remarks };
  } catch (err) {
    return { error: "Failed to generate remarks. Please try again." };
  }
}

export async function updateMLSRemarks(
  listingId: string,
  data: { mls_remarks?: string; mls_realtor_remarks?: string }
) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("listings")
    .update(data)
    .eq("id", listingId);

  if (error) return { error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}
