"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

export async function getContactRelationships(contactId: string) {
  const tc = await getAuthenticatedTenantClient();

  // Verify the contact belongs to this tenant
  const { data: contact } = await tc
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .single();

  if (!contact) {
    return { error: "Contact not found" };
  }

  const supabase = tc.raw;

  const { data, error } = await supabase
    .from("contact_relationships")
    .select(
      "*, contact_a:contacts!contact_a_id(id, name, type), contact_b:contacts!contact_b_id(id, name, type)"
    )
    .or(`contact_a_id.eq.${contactId},contact_b_id.eq.${contactId}`)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: "Failed to fetch relationships" };
  }

  return { data: data ?? [] };
}

export async function createRelationship(data: {
  contact_a_id: string;
  contact_b_id: string;
  relationship_type: string;
  relationship_label?: string;
  notes?: string;
}) {
  const tc = await getAuthenticatedTenantClient();

  // Validate both contacts belong to this tenant
  const { data: foundContacts, error: contactsError } = await tc
    .from("contacts")
    .select("id")
    .in("id", [data.contact_a_id, data.contact_b_id]);

  if (contactsError || !foundContacts || foundContacts.length < 2) {
    return { error: "One or both contacts not found" };
  }

  const { error } = await tc.raw.from("contact_relationships").insert({
    contact_a_id: data.contact_a_id,
    contact_b_id: data.contact_b_id,
    relationship_type: data.relationship_type,
    relationship_label: data.relationship_label ?? null,
    notes: data.notes ?? null,
    realtor_id: tc.realtorId,
  });

  if (error) {
    return { error: "Failed to create relationship" };
  }

  revalidatePath(`/contacts/${data.contact_a_id}`);
  revalidatePath(`/contacts/${data.contact_b_id}`);
  revalidatePath("/contacts");
  return { success: true };
}

export async function updateRelationship(
  id: string,
  contactId: string,
  data: Partial<{
    relationship_type: string;
    relationship_label: string | null;
    notes: string | null;
  }>
) {
  const tc = await getAuthenticatedTenantClient();

  // Verify the contact belongs to this tenant
  const { data: contact } = await tc
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .single();

  if (!contact) {
    return { error: "Contact not found" };
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.relationship_type !== undefined) updatePayload.relationship_type = data.relationship_type;
  if (data.relationship_label !== undefined) updatePayload.relationship_label = data.relationship_label;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  updatePayload.updated_at = new Date().toISOString();

  const { error } = await tc.raw
    .from("contact_relationships")
    .update(updatePayload)
    .eq("id", id)
    .or(`contact_a_id.eq.${contactId},contact_b_id.eq.${contactId}`);

  if (error) {
    return { error: "Failed to update relationship" };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}

export async function deleteRelationship(id: string, contactId: string) {
  const tc = await getAuthenticatedTenantClient();

  // Verify the contact belongs to this tenant
  const { data: contact } = await tc
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .single();

  if (!contact) {
    return { error: "Contact not found" };
  }

  const { error } = await tc.raw
    .from("contact_relationships")
    .delete()
    .eq("id", id)
    .or(`contact_a_id.eq.${contactId},contact_b_id.eq.${contactId}`);

  if (error) {
    return { error: "Failed to delete relationship" };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}
