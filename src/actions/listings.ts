"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";
import { listingSchema, type ListingFormData } from "@/lib/schemas";
import { validateStageForType } from "@/lib/contact-consistency";
import { triggerIngest } from "@/lib/rag/realtime-ingest";
import { emitNewsletterEvent } from "@/lib/newsletter-events";
import { trackEvent } from "@/lib/analytics";

export async function createListing(formData: ListingFormData) {
  const parsed = listingSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data", issues: parsed.error.issues };
  }

  if (parsed.data.list_price != null && !Number.isFinite(parsed.data.list_price)) {
    return { error: "list_price must be a finite number" };
  }

  const tc = await getAuthenticatedTenantClient();
  const { data, error } = await tc
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

  trackEvent('feature_used', tc.realtorId, { feature: 'listings', action: 'create' });

  revalidatePath("/listings");

  // Fire listing_created trigger for automation rules
  try {
    const { executeListingBlastRules } = await import("@/lib/listing-blast-executor");
    await executeListingBlastRules("listing_created", data.id);
  } catch {
    // Don't fail listing creation if blast fails
  }

  // Real-time RAG ingestion
  triggerIngest("listings", data.id);

  // A4: Auto-generate MLS remarks on first listing (fire-and-forget)
  try {
    const { count } = await tc.from("listings").select("id", { count: "exact", head: true });
    if ((count ?? 0) <= 1) {
      import("@/lib/anthropic/creative-director").then(({ generateMLSRemarks }) => {
        generateMLSRemarks(data.id).catch(console.error);
      });
    }
  } catch {
    // Don't fail listing creation if auto-remarks fails
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
  const tc = await getAuthenticatedTenantClient();

  // Validate numeric fields are finite
  const numericFields = ["list_price", "sold_price", "commission_rate", "commission_amount"] as const;
  for (const field of numericFields) {
    const val = formData[field as keyof typeof formData];
    if (val != null && typeof val === "number" && !Number.isFinite(val)) {
      return { error: `${field} must be a finite number` };
    }
  }

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

  // Check if price changed (for blast automation trigger + newsletter event)
  const priceChanged = updateData.list_price !== undefined;
  let oldPrice: number | null = null;
  let sellerIdForEvent: string | null = null;
  if (priceChanged) {
    const { data: current } = await tc
      .from("listings")
      .select("list_price, status, seller_id")
      .eq("id", id)
      .single();
    oldPrice = current?.list_price ?? null;
    sellerIdForEvent = (current as { seller_id?: string } | null)?.seller_id ?? null;
  }

  const { error } = await tc
    .from("listings")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return { error: "Failed to update listing" };
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/contacts");

  // Real-time RAG re-ingestion
  triggerIngest("listings", id);

  // Newsletter Engine v3: emit listing_price_dropped when price actually decreased.
  // Non-blocking — failure logged, never thrown.
  if (
    priceChanged &&
    typeof updateData.list_price === "number" &&
    typeof oldPrice === "number" &&
    updateData.list_price < oldPrice
  ) {
    await emitNewsletterEvent(tc, {
      event_type: "listing_price_dropped",
      listing_id: id,
      contact_id: sellerIdForEvent,
      event_data: {
        listing_id: id,
        seller_id: sellerIdForEvent,
        old_price: oldPrice,
        new_price: updateData.list_price,
      },
    });
  }

  return { success: true };
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  active: ["sold"],
  pending: ["sold", "active"],
  sold: [], // terminal state
};

export type ListingStatusOverride =
  | "active"
  | "pending"
  | "conditional"
  | "sold"
  | "cancelled"
  | "expired"
  | "withdrawn";

/**
 * Manual status override — bypasses workflow-gate transition rules.
 * Used when the realtor needs to set an out-of-band status (Conditional,
 * Cancelled, Expired, Withdrawn) that the sequential workflow never produces.
 */
export async function overrideListingStatus(
  id: string,
  newStatus: ListingStatusOverride
) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("listings")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return { error: "Failed to update listing status" };

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/contacts");

  // Sync seller stage when relevant
  const stageMap: Record<string, string> = {
    conditional: "under_contract",
    sold: "closed",
  };
  const newSellerStage = stageMap[newStatus];
  if (newSellerStage) {
    try {
      const { data: stageListing } = await tc
        .from("listings")
        .select("seller_id")
        .eq("id", id)
        .single();

      if (stageListing?.seller_id) {
        const { data: seller } = await tc
          .from("contacts")
          .select("stage_bar, type")
          .eq("id", stageListing.seller_id)
          .single();

        if (seller?.type === "seller") {
          const stageOrder = ["new", "qualified", "active_listing", "under_contract", "closed"];
          const currentIdx = stageOrder.indexOf(seller.stage_bar || "new");
          const newIdx = stageOrder.indexOf(newSellerStage);
          if (newIdx > currentIdx) {
            const stageUpdates: Record<string, unknown> = { stage_bar: newSellerStage };
            if (newSellerStage === "closed") stageUpdates.lead_status = "closed";
            if (newSellerStage === "under_contract") stageUpdates.lead_status = "under_contract";
            await tc
              .from("contacts")
              .update(stageUpdates)
              .eq("id", stageListing.seller_id);
          }
        }
      }
    } catch {
      // Don't fail status update if seller stage sync fails
    }
  }

  return { success: true };
}

export async function updateListingStatus(
  id: string,
  newStatus: "active" | "pending" | "sold"
) {
  const tc = await getAuthenticatedTenantClient();

  // Fetch current listing to validate transition (also grab seller_id for newsletter event)
  const { data: listing } = await tc
    .from("listings")
    .select("status, seller_id")
    .eq("id", id)
    .single();

  if (!listing) return { error: "Listing not found" };

  const allowed = VALID_TRANSITIONS[listing.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return {
      error: `Cannot transition from "${listing.status}" to "${newStatus}"`,
    };
  }

  // FINTRAC compliance gate — added 2026-04-09 after QA audit found 22
  // active listings with zero seller_identities rows.
  //
  // BC/federal regulation requires FINTRAC Part XV.1 identity verification
  // for every real estate transaction. A listing cannot transition to
  // "active" (open for marketing + offers) without at least one
  // seller_identities row recording the seller's verified ID.
  //
  // Transitions to "sold" or "pending" are also gated because those
  // imply a transaction is in flight. Only transitions TO "draft",
  // "withdrawn", or other non-active terminal states are exempt.
  //
  // Override: if an environment really needs to bypass this (e.g. dev
  // with test data), set env var BYPASS_FINTRAC_GATE=true. Do NOT set
  // this in production.
  const FINTRAC_GATED_STATUSES = new Set(["active", "pending", "sold"]);
  if (FINTRAC_GATED_STATUSES.has(newStatus) && process.env.BYPASS_FINTRAC_GATE !== "true") {
    const { count: identityCount } = await tc.raw
      .from("seller_identities")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id);

    if ((identityCount ?? 0) === 0) {
      return {
        error:
          `FINTRAC compliance: cannot set listing to "${newStatus}" without at least one seller identity record. ` +
          `Add a seller_identities row via the Phase 1 intake form (full name, DOB, citizenship, ID type/number/expiry) before activating this listing.`,
      };
    }
  }

  const { error } = await tc
    .from("listings")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return { error: "Failed to update listing status" };

  // Newsletter Engine v3: emit listing_sold when transitioning to sold.
  // Non-blocking — failure logged, never thrown.
  if (newStatus === "sold") {
    const sellerId = (listing as { seller_id?: string | null }).seller_id ?? null;
    await emitNewsletterEvent(tc, {
      event_type: "listing_sold",
      listing_id: id,
      contact_id: sellerId,
      event_data: {
        listing_id: id,
        seller_id: sellerId,
      },
    });
  }

  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/contacts");

  // Auto-sync seller's stage_bar when listing status changes
  const stageMap: Record<string, string> = {
    active: "active_listing",
    pending: "under_contract",
    sold: "closed",
  };
  const newSellerStage = stageMap[newStatus];
  if (newSellerStage) {
    try {
      const { data: stageListing } = await tc
        .from("listings")
        .select("seller_id")
        .eq("id", id)
        .single();

      if (stageListing?.seller_id) {
        const { data: seller } = await tc
          .from("contacts")
          .select("stage_bar, type, lead_status")
          .eq("id", stageListing.seller_id)
          .single();

        if (seller && seller.type === "seller") {
          const stageOrder = ["new", "qualified", "active_listing", "under_contract", "closed"];
          const currentIdx = stageOrder.indexOf(seller.stage_bar || "new");
          const newIdx = stageOrder.indexOf(newSellerStage);

          // Only advance, never go backwards
          if (newIdx > currentIdx) {
            const validStage = validateStageForType("seller", newSellerStage);
            const stageUpdates: Record<string, unknown> = { stage_bar: validStage };
            if (newSellerStage === "closed") stageUpdates.lead_status = "closed";
            if (newSellerStage === "under_contract") stageUpdates.lead_status = "under_contract";
            await tc
              .from("contacts")
              .update(stageUpdates)
              .eq("id", stageListing.seller_id);
          }
        }
      }
    } catch {
      // Don't fail status update if seller stage sync fails
    }
  }

  // Fire listing_active trigger for blast automation rules
  if (newStatus === "active") {
    try {
      const { executeListingBlastRules } = await import("@/lib/listing-blast-executor");
      await executeListingBlastRules("listing_active", id);
    } catch {
      // Don't fail status update if blast fails
    }
  }

  // Fire listing_status_change trigger for workflow auto-enrollment (e.g., post-close workflows)
  if (newStatus === "sold") {
    try {
      const { data: fullListing } = await tc
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
