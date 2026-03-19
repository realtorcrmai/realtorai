"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { listingSchema, type ListingFormData } from "@/lib/schemas";

export async function createListing(formData: ListingFormData) {
  const parsed = listingSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data", issues: parsed.error.issues };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("listings")
    .insert({
      ...parsed.data,
      list_price: parsed.data.list_price ?? null,
      mls_number: parsed.data.mls_number || null,
      showing_window_start: parsed.data.showing_window_start || null,
      showing_window_end: parsed.data.showing_window_end || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { error: "Failed to create listing" };
  }

  revalidatePath("/listings");

  // Advance seller lifecycle milestones (listing created → "has_listing" milestone)
  if (data?.seller_id) {
    try {
      const { advanceLifecycleForContact } = await import("@/lib/workflow-triggers");
      await advanceLifecycleForContact(data.seller_id);
    } catch {
      // Don't fail listing creation if lifecycle advancement fails
    }
  }

  return { success: true, listing: data };
}

export async function updateListing(
  id: string,
  formData: Partial<ListingFormData> & {
    sold_price?: number | null;
    buyer_id?: string | null;
    closing_date?: string | null;
    commission_rate?: number | null;
    commission_amount?: number | null;
  }
) {
  const supabase = createAdminClient();

  // Auto-calculate commission if sold_price and commission_rate are provided
  const updateData = { ...formData };
  if (
    updateData.sold_price &&
    updateData.commission_rate &&
    !updateData.commission_amount
  ) {
    (updateData as Record<string, unknown>).commission_amount =
      Number(updateData.sold_price) * (Number(updateData.commission_rate) / 100);
  }

  const { error } = await supabase
    .from("listings")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { error: "Failed to update listing" };
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/contacts");
  return { success: true };
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  active: ["sold"],
  pending: ["sold", "active"],
  sold: [], // terminal state
};

export async function updateListingStatus(
  id: string,
  newStatus: "active" | "pending" | "sold"
) {
  const supabase = createAdminClient();

  // Fetch current listing to validate transition
  const { data: listing } = await supabase
    .from("listings")
    .select("status")
    .eq("id", id)
    .single();

  if (!listing) return { error: "Listing not found" };

  const allowed = VALID_TRANSITIONS[listing.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return {
      error: `Cannot transition from "${listing.status}" to "${newStatus}"`,
    };
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return { error: "Failed to update listing status" };

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/contacts");

  // Advance lifecycle milestones on any status change (active, pending, sold)
  try {
    const supabaseLife = createAdminClient();
    const { data: lifeListing } = await supabaseLife
      .from("listings")
      .select("seller_id, buyer_id")
      .eq("id", id)
      .single();

    if (lifeListing) {
      const { advanceLifecycleForContact } = await import("@/lib/workflow-triggers");
      if (lifeListing.seller_id) {
        await advanceLifecycleForContact(lifeListing.seller_id);
      }
      if (lifeListing.buyer_id) {
        await advanceLifecycleForContact(lifeListing.buyer_id);
      }
    }
  } catch {
    // Don't fail status update if lifecycle advancement fails
  }

  // Fire listing_status_change trigger for workflow auto-enrollment (e.g., post-close workflows)
  if (newStatus === "sold") {
    try {
      const supabase2 = createAdminClient();
      const { data: fullListing } = await supabase2
        .from("listings")
        .select("seller_id, buyer_id")
        .eq("id", id)
        .single();

      if (fullListing) {
        const { fireTrigger } = await import("@/lib/workflow-triggers");

        // Enroll seller in post-close seller workflow
        if (fullListing.seller_id) {
          await fireTrigger({
            type: "listing_status_change",
            contactId: fullListing.seller_id,
            data: { newStatus, listingId: id },
          });
        }

        // Enroll buyer in post-close buyer workflow
        if (fullListing.buyer_id) {
          await fireTrigger({
            type: "listing_status_change",
            contactId: fullListing.buyer_id,
            data: { newStatus, listingId: id },
          });
        }

      }
    } catch {
      // Don't fail status update if triggers fail
    }
  }

  return { success: true };
}
