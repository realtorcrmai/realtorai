"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getHouseholds() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("households")
    .select("id, name")
    .order("name");

  if (error) {
    return { error: "Failed to fetch households" };
  }

  return { data: data ?? [] };
}

export async function createHousehold(data: {
  name: string;
  address?: string;
  notes?: string;
}) {
  const supabase = createAdminClient();

  const { data: household, error } = await supabase
    .from("households")
    .insert({
      name: data.name,
      address: data.address ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: "Failed to create household" };
  }

  revalidatePath("/contacts");
  return { success: true, data: household };
}

export async function updateHousehold(
  id: string,
  data: Partial<{
    name: string;
    address: string | null;
    notes: string | null;
  }>
) {
  const supabase = createAdminClient();

  const updatePayload: Record<string, unknown> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.address !== undefined) updatePayload.address = data.address;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  updatePayload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("households")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: "Failed to update household" };
  }

  revalidatePath("/contacts");
  return { success: true };
}

export async function addContactToHousehold(
  contactId: string,
  householdId: string
) {
  const supabase = createAdminClient();

  // Verify the household exists before updating the contact
  const { data: household, error: householdError } = await supabase
    .from("households")
    .select("id")
    .eq("id", householdId)
    .single();

  if (householdError || !household) {
    return { error: "Household not found" };
  }

  const { error } = await supabase
    .from("contacts")
    .update({ household_id: householdId })
    .eq("id", contactId);

  if (error) {
    return { error: "Failed to add contact to household" };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}

export async function removeContactFromHousehold(contactId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("contacts")
    .update({ household_id: null })
    .eq("id", contactId);

  if (error) {
    return { error: "Failed to remove contact from household" };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}

export async function getHouseholdMembers(householdId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, type")
    .eq("household_id", householdId);

  if (error) {
    return { error: "Failed to fetch household members" };
  }

  return { data: data ?? [] };
}
