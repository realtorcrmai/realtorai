"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getContactRelationships(contactId: string) {
  const supabase = createAdminClient();

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
  const supabase = createAdminClient();

  // Validate both contacts exist in a single query
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id")
    .in("id", [data.contact_a_id, data.contact_b_id]);

  const foundIds = new Set((contacts ?? []).map((c) => c.id));
  if (!foundIds.has(data.contact_a_id)) {
    return { error: "Contact A not found" };
  }
  if (!foundIds.has(data.contact_b_id)) {
    return { error: "Contact B not found" };
  }

  const { error } = await supabase.from("contact_relationships").insert({
    contact_a_id: data.contact_a_id,
    contact_b_id: data.contact_b_id,
    relationship_type: data.relationship_type,
    relationship_label: data.relationship_label ?? null,
    notes: data.notes ?? null,
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
  const supabase = createAdminClient();

  const updatePayload: Record<string, unknown> = {};
  if (data.relationship_type !== undefined) updatePayload.relationship_type = data.relationship_type;
  if (data.relationship_label !== undefined) updatePayload.relationship_label = data.relationship_label;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  updatePayload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("contact_relationships")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: "Failed to update relationship" };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}

export async function deleteRelationship(id: string, contactId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("contact_relationships")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Failed to delete relationship" };
  }

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { success: true };
}
