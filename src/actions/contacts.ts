"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { contactSchema, type ContactFormData } from "@/lib/schemas";

export async function createContact(formData: ContactFormData) {
  const parsed = contactSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data", issues: parsed.error.issues };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
    })
    .select()
    .single();

  if (error) {
    return { error: "Failed to create contact" };
  }

  revalidatePath("/contacts");
  return { success: true, contact: data };
}

export async function updateContact(
  id: string,
  formData: Partial<ContactFormData>
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      ...formData,
      email: formData.email || null,
    })
    .eq("id", id);

  if (error) {
    return { error: "Failed to update contact" };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

export async function addCommunicationNote(
  contactId: string,
  body: string
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("communications").insert({
    contact_id: contactId,
    direction: "outbound",
    channel: "note",
    body,
  });

  if (error) {
    return { error: "Failed to add note" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}
