"use server";

import { z } from "zod";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

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
  const { data, error } = await tc
    .from("buyer_identities")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return { error: "Failed to create buyer identity" };

  revalidatePath(`/listings/${parsed.data.listing_id}`);
  return { success: true, data };
}

export async function deleteBuyerIdentity(id: string, listingId: string) {
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc
    .from("buyer_identities")
    .delete()
    .eq("id", id);

  if (error) return { error: "Failed to delete buyer identity" };

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
  return data ?? [];
}
