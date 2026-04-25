"use server";

/**
 * Buyer identity (FINTRAC KYC) server actions.
 *
 * Mirrors seller-identities.ts — required when a listing transitions to
 * pending/sold with a buyer_id. PII encryption + audit wiring added in
 * migration 147 / SOC 2 WS-1.
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

const BuyerIdentitySchema = z.object({
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

export type BuyerIdentityInput = z.infer<typeof BuyerIdentitySchema>;

export async function createBuyerIdentity(input: BuyerIdentityInput) {
  const parsed = BuyerIdentitySchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input", issues: parsed.error.issues };
  }

  const tc = await getAuthenticatedTenantClient();

  const encrypted = encryptFields(parsed.data, FINTRAC_ENCRYPTED_FIELDS);

  const { data, error } = await tc
    .from("buyer_identities")
    .insert(encrypted)
    .select()
    .single();

  if (error) return { error: "Failed to create buyer identity" };

  await logAuditEvent({
    action: AUDIT_ACTIONS.IDENTITY_CREATED,
    actor: { id: tc.realtorId },
    tenantId: tc.realtorId,
    resource: { type: "buyer_identity", id: data?.id ?? null },
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
  return {
    success: true,
    data: decryptFields(
      data as Record<string, unknown>,
      FINTRAC_ENCRYPTED_FIELDS
    ),
  };
}

export async function deleteBuyerIdentity(id: string, listingId: string) {
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc
    .from("buyer_identities")
    .delete()
    .eq("id", id);

  if (error) return { error: "Failed to delete buyer identity" };

  await logAuditEvent({
    action: AUDIT_ACTIONS.IDENTITY_DELETED,
    actor: { id: tc.realtorId },
    tenantId: tc.realtorId,
    resource: { type: "buyer_identity", id },
    metadata: { listing_id: listingId },
  });

  revalidatePath(`/listings/${listingId}`);
  return { success: true };
}

export async function getBuyerIdentities(listingId: string) {
  const tc = await getAuthenticatedTenantClient();
  const { data, error } = await tc
    .from("buyer_identities")
    .select("*")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error) return [];

  const rows = (data ?? []).map((r: Record<string, unknown>) =>
    decryptFields(r, FINTRAC_ENCRYPTED_FIELDS)
  );

  if (rows.length > 0) {
    await logAuditEvent({
      action: AUDIT_ACTIONS.PII_VIEWED,
      actor: { id: tc.realtorId },
      tenantId: tc.realtorId,
      resource: { type: "buyer_identity", id: listingId },
      metadata: {
        count: rows.length,
        listing_id: listingId,
        source: "buyer_identities.list",
      },
    });
  }

  return rows;
}
