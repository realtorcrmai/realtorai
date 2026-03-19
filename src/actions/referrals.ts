"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getReferrals(contactId: string) {
  const supabase = createAdminClient();

  // Get referrals where this contact is either the referrer or the referred client
  const [{ data: asReferrer, error: e1 }, { data: asReferred, error: e2 }] =
    await Promise.all([
      supabase
        .from("referrals")
        .select(
          "*, referred_client:contacts!referred_client_contact_id(id, name, type), closed_deal:listings!closed_deal_id(id, address)"
        )
        .eq("referred_by_contact_id", contactId)
        .order("referral_date", { ascending: false }),
      supabase
        .from("referrals")
        .select(
          "*, referrer:contacts!referred_by_contact_id(id, name, type), closed_deal:listings!closed_deal_id(id, address)"
        )
        .eq("referred_client_contact_id", contactId)
        .order("referral_date", { ascending: false }),
    ]);

  if (e1 || e2) {
    return { error: "Failed to fetch referrals" };
  }

  return {
    asReferrer: asReferrer ?? [],
    asReferred: asReferred ?? [],
  };
}

export async function createReferral(data: {
  referred_by_contact_id: string;
  referred_client_contact_id: string;
  referral_type?: "buyer" | "seller" | "rental" | "other";
  referral_date?: string;
  referral_fee_percent?: number | null;
  status?: "open" | "accepted" | "closed" | "lost";
  notes?: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("referrals").insert({
    referred_by_contact_id: data.referred_by_contact_id,
    referred_client_contact_id: data.referred_client_contact_id,
    referral_type: data.referral_type ?? "buyer",
    referral_date: data.referral_date ?? new Date().toISOString().split("T")[0],
    referral_fee_percent: data.referral_fee_percent ?? null,
    status: data.status ?? "open",
    notes: data.notes ?? null,
  });

  if (error) {
    return { error: "Failed to create referral" };
  }

  revalidatePath(`/contacts/${data.referred_by_contact_id}`);
  revalidatePath(`/contacts/${data.referred_client_contact_id}`);
  revalidatePath("/contacts");
  return { success: true };
}

export async function updateReferral(
  id: string,
  contactId: string,
  data: Partial<{
    referral_type: "buyer" | "seller" | "rental" | "other";
    referral_fee_percent: number | null;
    status: "open" | "accepted" | "closed" | "lost";
    closed_deal_id: string | null;
    notes: string | null;
  }>
) {
  const supabase = createAdminClient();

  const updatePayload: Record<string, unknown> = {};
  if (data.referral_type !== undefined) updatePayload.referral_type = data.referral_type;
  if (data.referral_fee_percent !== undefined) updatePayload.referral_fee_percent = data.referral_fee_percent;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.closed_deal_id !== undefined) updatePayload.closed_deal_id = data.closed_deal_id;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  updatePayload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("referrals")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: "Failed to update referral" };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}

export async function deleteReferral(id: string, contactId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("referrals").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete referral" };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}
