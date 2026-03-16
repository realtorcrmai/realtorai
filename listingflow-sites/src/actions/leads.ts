"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createLead(data: {
  site_id: string;
  lead_type: string;
  source_page?: string;
  form_data: Record<string, unknown>;
}) {
  const supabase = createAdminClient();

  // Also create a contact in the CRM contacts table
  const name =
    (data.form_data.name as string) || (data.form_data.full_name as string) || "Website Visitor";
  const phone = (data.form_data.phone as string) || null;
  const email = (data.form_data.email as string) || null;

  let contactId: string | null = null;

  if (name && (phone || email)) {
    // Check if contact already exists
    let query = supabase.from("contacts").select("id");
    if (email) {
      query = query.eq("email", email);
    } else if (phone) {
      query = query.eq("phone", phone);
    }
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      contactId = existing.id;
    } else {
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          name,
          phone,
          email,
          type: "buyer",
          pref_channel: "sms",
          notes: `Lead from website (${data.lead_type})`,
        })
        .select("id")
        .single();
      contactId = newContact?.id ?? null;
    }
  }

  const { data: lead, error } = await supabase
    .from("site_leads")
    .insert({
      site_id: data.site_id,
      contact_id: contactId,
      lead_type: data.lead_type,
      source_page: data.source_page || null,
      form_data: data.form_data,
      status: "new",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/leads");
  return { success: true, lead };
}

export async function updateLeadStatus(leadId: string, status: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_leads")
    .update({ status })
    .eq("id", leadId);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  return { success: true };
}
