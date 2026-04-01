"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

export async function getHouseholds() {
  const tc = await getAuthenticatedTenantClient();

  const { data, error } = await tc
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
  const tc = await getAuthenticatedTenantClient();

  const { data: household, error } = await tc
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
  const tc = await getAuthenticatedTenantClient();

  const updatePayload: Record<string, unknown> = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.address !== undefined) updatePayload.address = data.address;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  updatePayload.updated_at = new Date().toISOString();

  const { error } = await tc
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
  const tc = await getAuthenticatedTenantClient();

  // Verify the household exists before updating the contact
  const { data: household, error: householdError } = await tc
    .from("households")
    .select("id")
    .eq("id", householdId)
    .single();

  if (householdError || !household) {
    return { error: "Household not found" };
  }

  const { error } = await tc
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
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
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
  const tc = await getAuthenticatedTenantClient();

  const { data, error } = await tc
    .from("contacts")
    .select("id, name, type")
    .eq("household_id", householdId);

  if (error) {
    return { error: "Failed to fetch household members" };
  }

  return { data: data ?? [] };
}
