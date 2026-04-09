"use server";

/**
 * Seller identity (FINTRAC KYC) server actions.
 *
 * BC real estate regulations require identity verification for every
 * seller in a transaction (FINTRAC Part XV.1). This file provides the
 * CRUD helpers the Phase 1 intake UI uses to capture that data.
 *
 * Data shape (from migration 078_seller_identities.sql):
 *   listing_id        FK, required
 *   contact_id        FK, optional (seller contact if known)
 *   full_name         text, required
 *   dob               date, optional
 *   citizenship       text, default 'canadian'
 *   id_type           text, default 'drivers_license'
 *   id_number         text, optional
 *   id_expiry         date, optional
 *   phone             text
 *   email             text
 *   mailing_address   text
 *   occupation        text
 *   sort_order        integer, default 0
 *
 * Multi-tenancy: all reads/writes go through getAuthenticatedTenantClient
 * so realtor_id is auto-injected. See HC-12.
 *
 * Added: 2026-04-09 (post-consolidation QA audit surfaced 22 active
 * listings with zero seller_identities rows — a compliance breach).
 */

import { z } from "zod";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

const CreateSellerIdentitySchema = z.object({
  listing_id: z.string().uuid(),
  contact_id: z.string().uuid().optional().nullable(),
  full_name: z.string().min(1, "Full name required"),
  dob: z.string().optional().nullable(),
  citizenship: z.string().default("canadian"),
  id_type: z.string().default("drivers_license"),
  id_number: z.string().optional().nullable(),
  id_expiry: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  mailing_address: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
});

export type SellerIdentityInput = z.infer<typeof CreateSellerIdentitySchema>;

/**
 * Returns the FINTRAC status for a listing: whether at least one
 * seller_identities row exists. Used by the listing detail UI to
 * surface a warning banner when FINTRAC data is missing.
 */
export async function getListingFintracStatus(listingId: string) {
  const tc = await getAuthenticatedTenantClient();
  const { count, error } = await tc.raw
    .from("seller_identities")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  if (error) return { error: error.message, hasIdentity: false, count: 0 };
  return { hasIdentity: (count ?? 0) > 0, count: count ?? 0 };
}

/**
 * List all seller identities for a listing.
 */
export async function listSellerIdentities(listingId: string) {
  const tc = await getAuthenticatedTenantClient();
  const { data, error } = await tc.raw
    .from("seller_identities")
    .select("*")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

/**
 * Create a new seller identity record for a listing (FINTRAC intake).
 */
export async function createSellerIdentity(input: SellerIdentityInput) {
  const parsed = CreateSellerIdentitySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const tc = await getAuthenticatedTenantClient();

  // Verify listing belongs to this realtor before inserting — prevents
  // cross-tenant injection even though RLS should catch it.
  const { data: listing } = await tc
    .from("listings")
    .select("id")
    .eq("id", parsed.data.listing_id)
    .single();

  if (!listing) {
    return { error: "Listing not found or not accessible" };
  }

  const { data, error } = await tc.raw
    .from("seller_identities")
    .insert({
      ...parsed.data,
      realtor_id: tc.realtorId,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/listings/${parsed.data.listing_id}`);
  return { data };
}

/**
 * Update an existing seller identity record.
 */
export async function updateSellerIdentity(
  id: string,
  patch: Partial<SellerIdentityInput>
) {
  const tc = await getAuthenticatedTenantClient();
  const { data, error } = await tc.raw
    .from("seller_identities")
    .update(patch)
    .eq("id", id)
    .eq("realtor_id", tc.realtorId)
    .select()
    .single();

  if (error) return { error: error.message };

  if (data?.listing_id) revalidatePath(`/listings/${data.listing_id}`);
  return { data };
}

/**
 * Delete a seller identity record. Note: if this is the last identity
 * on an active listing, the listing will still be active but in a
 * compliance-violation state. The UI should warn before allowing this.
 */
export async function deleteSellerIdentity(id: string) {
  const tc = await getAuthenticatedTenantClient();
  const { data: row } = await tc.raw
    .from("seller_identities")
    .select("listing_id")
    .eq("id", id)
    .eq("realtor_id", tc.realtorId)
    .single();

  const { error } = await tc.raw
    .from("seller_identities")
    .delete()
    .eq("id", id)
    .eq("realtor_id", tc.realtorId);

  if (error) return { error: error.message };

  if (row?.listing_id) revalidatePath(`/listings/${row.listing_id}`);
  return { success: true };
}
