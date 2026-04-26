"use server";

/**
 * Seller identity (FINTRAC KYC) server actions.
 *
 * BC real estate regulations require identity verification for every
 * seller in a transaction (FINTRAC Part XV.1). This file provides the
 * CRUD helpers the Phase 1 intake UI uses to capture that data.
 *
 * PII handling (SOC 2 CC6.1 — migration 147):
 *   - id_number, dob, citizenship, mailing_address are stored encrypted
 *     (AES-256-GCM via src/lib/crypto.ts).
 *   - Writes: encryptFields() runs after Zod validation, before insert/update.
 *   - Reads: decryptFields() runs on every row returned to the caller so
 *     UI code sees plaintext.
 *   - Empty/null values pass through unencrypted — see crypto.ts for why.
 *
 * Audit events (SOC 2 CC7.2):
 *   - Every list read logs PII_VIEWED (fingerprints the fact of access,
 *     never the values).
 *   - Create/update/delete log IDENTITY_CREATED / UPDATED / DELETED with
 *     changed_fields only — the values themselves are blocked by
 *     sanitizeMetadata() as a second line of defence.
 *
 * Multi-tenancy: all reads/writes go through getAuthenticatedTenantClient
 * so realtor_id is auto-injected. See HC-12.
 */

import { z } from "zod";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";
import {
  encryptFields,
  decryptFields,
  FINTRAC_ENCRYPTED_FIELDS,
} from "@/lib/crypto";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

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
 *
 * Count-only — no rows fetched, no decryption needed, no PII_VIEWED event
 * (we are not reading identity values).
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
 * List all seller identities for a listing. Decrypts FINTRAC fields
 * before returning and logs a PII_VIEWED event.
 */
export async function listSellerIdentities(listingId: string) {
  const tc = await getAuthenticatedTenantClient();
  const { data, error } = await tc.raw
    .from("seller_identities")
    .select("*")
    .eq("listing_id", listingId)
    .eq("realtor_id", tc.realtorId)
    .order("sort_order", { ascending: true });

  if (error) return { error: error.message };

  const rows = (data ?? []).map((r) =>
    decryptFields(r as Record<string, unknown>, FINTRAC_ENCRYPTED_FIELDS)
  );

  if (rows.length > 0) {
    await logAuditEvent({
      action: AUDIT_ACTIONS.PII_VIEWED,
      actor: { id: tc.realtorId },
      tenantId: tc.realtorId,
      resource: { type: "seller_identity", id: listingId },
      metadata: {
        count: rows.length,
        listing_id: listingId,
        source: "seller_identities.list",
      },
    });
  }

  return { data: rows };
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

  const encrypted = encryptFields(parsed.data, FINTRAC_ENCRYPTED_FIELDS);

  const { data, error } = await tc.raw
    .from("seller_identities")
    .insert({
      ...encrypted,
      realtor_id: tc.realtorId,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logAuditEvent({
    action: AUDIT_ACTIONS.IDENTITY_CREATED,
    actor: { id: tc.realtorId },
    tenantId: tc.realtorId,
    resource: { type: "seller_identity", id: data?.id ?? null },
    metadata: {
      listing_id: parsed.data.listing_id,
      changed_fields: Object.keys(parsed.data).filter(
        (k) =>
          (parsed.data as Record<string, unknown>)[k] !== null &&
          (parsed.data as Record<string, unknown>)[k] !== undefined
      ),
    },
  });

  revalidatePath(`/listings/${parsed.data.listing_id}`);

  // Return decrypted row to the caller — UI expects plaintext
  return {
    data: decryptFields(data as Record<string, unknown>, FINTRAC_ENCRYPTED_FIELDS),
  };
}

/**
 * Update an existing seller identity record.
 */
export async function updateSellerIdentity(
  id: string,
  patch: Partial<SellerIdentityInput>
) {
  const tc = await getAuthenticatedTenantClient();

  const encryptedPatch = encryptFields(
    patch as Record<string, unknown>,
    FINTRAC_ENCRYPTED_FIELDS
  );

  const { data, error } = await tc.raw
    .from("seller_identities")
    .update(encryptedPatch)
    .eq("id", id)
    .eq("realtor_id", tc.realtorId)
    .select()
    .single();

  if (error) return { error: error.message };

  await logAuditEvent({
    action: AUDIT_ACTIONS.IDENTITY_UPDATED,
    actor: { id: tc.realtorId },
    tenantId: tc.realtorId,
    resource: { type: "seller_identity", id },
    metadata: {
      listing_id: data?.listing_id ?? null,
      changed_fields: Object.keys(patch),
    },
  });

  if (data?.listing_id) revalidatePath(`/listings/${data.listing_id}`);

  return {
    data: decryptFields(data as Record<string, unknown>, FINTRAC_ENCRYPTED_FIELDS),
  };
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

  await logAuditEvent({
    action: AUDIT_ACTIONS.IDENTITY_DELETED,
    actor: { id: tc.realtorId },
    tenantId: tc.realtorId,
    resource: { type: "seller_identity", id },
    metadata: {
      listing_id: row?.listing_id ?? null,
    },
  });

  if (row?.listing_id) revalidatePath(`/listings/${row.listing_id}`);
  return { success: true };
}
