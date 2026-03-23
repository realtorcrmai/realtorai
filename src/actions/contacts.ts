"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { contactSchema, type ContactFormData } from "@/lib/schemas";
import type { Json } from "@/types/database";
import { enforceConsistency } from "@/lib/contact-consistency";

export async function checkDuplicateContact(phone: string, email?: string) {
  const supabase = createAdminClient();
  const normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, "");
  const last10 = normalizedPhone.slice(-10);

  const { data: matches } = await supabase
    .from("contacts")
    .select("id, name, phone, email")
    .or(`phone.ilike.%${last10},email.ilike.${email || "NOMATCH"}`)
    .limit(1);

  if (matches?.length) {
    const matchedOn = matches[0].phone?.includes(last10) ? "phone" : "email";
    return { duplicate: true, existing: matches[0], matchedOn };
  }
  return { duplicate: false };
}

export async function createContact(formData: ContactFormData) {
  const parsed = contactSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data", issues: parsed.error.issues };
  }

  const supabase = createAdminClient();

  // Duplicate check
  const dupCheck = await checkDuplicateContact(parsed.data.phone, parsed.data.email || undefined);
  if (dupCheck.duplicate) {
    return {
      error: `Contact already exists: ${dupCheck.existing?.name} (matched by ${dupCheck.matchedOn})`,
      duplicate: dupCheck.existing,
    };
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      type: parsed.data.type,
      pref_channel: parsed.data.pref_channel,
      notes: parsed.data.notes || null,
      address: parsed.data.address || null,
      referred_by_id: parsed.data.referred_by_id || null,
      source: parsed.data.source || null,
      lead_status: parsed.data.lead_status || "new",
      partner_type: parsed.data.partner_type || null,
      company_name: parsed.data.company_name || null,
      job_title: parsed.data.job_title || null,
      typical_client_profile: parsed.data.typical_client_profile || null,
      referral_agreement_terms: parsed.data.referral_agreement_terms || null,
      buyer_preferences: (parsed.data.buyer_preferences as Json) ?? null,
      seller_preferences: (parsed.data.seller_preferences as Json) ?? null,
      demographics: (parsed.data.demographics as Json) ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: "Failed to create contact" };
  }

  revalidatePath("/contacts");

  // Auto-enroll in journey (buyer or seller track, starting at "lead" phase)
  try {
    const journeyType = data.type === "seller" ? "seller" : "buyer";
    const nextEmailAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // next email in 3 days
    await supabase.from("contact_journeys").insert({
      contact_id: data.id,
      journey_type: journeyType,
      current_phase: "lead",
      is_paused: false,
      next_email_at: nextEmailAt,
      send_mode: "review",
    });

    // Generate and queue welcome email immediately
    if (data.email) {
      const welcomeSubject = journeyType === "buyer"
        ? `Welcome! Let's Find Your Dream Home`
        : `What's Your Home Worth? Let's Find Out`;
      const firstName = data.name?.split(" ")[0] || "there";
      const welcomeHtml = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f6f5ff;padding:20px;margin:0;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(79,53,210,0.06);">
<div style="padding:28px 32px 20px;text-align:center;"><h1 style="font-size:22px;font-weight:700;color:#4f35d2;margin:0;">ListingFlow</h1></div>
<div style="padding:0 32px 24px;">
<p style="font-size:16px;color:#1a1535;margin:0 0 12px;">Hi ${firstName},</p>
<p style="font-size:15px;color:#3a3a5c;line-height:1.6;margin:0 0 16px;">${journeyType === "buyer"
  ? "Welcome! I'm excited to help you find your perfect home. I'll be sending you personalized property matches based on your preferences, market updates for your areas of interest, and neighbourhood guides to help you make the best decision."
  : "Welcome! I'd love to help you get the best value for your property. I'll be sharing recent comparable sales in your area, market trends, and expert tips to make your selling experience smooth and successful."}</p>
<p style="font-size:15px;color:#3a3a5c;line-height:1.6;margin:0 0 16px;">Here's what you can expect from me:</p>
<div style="background:#f6f5ff;border-radius:10px;padding:16px 20px;margin:0 0 20px;">
<div style="font-size:14px;color:#1a1535;margin:0 0 8px;">✅ <strong>${journeyType === "buyer" ? "New listing alerts" : "Comparable sales data"}</strong> tailored to you</div>
<div style="font-size:14px;color:#1a1535;margin:0 0 8px;">✅ <strong>Market updates</strong> for your area</div>
<div style="font-size:14px;color:#1a1535;margin:0;">✅ <strong>${journeyType === "buyer" ? "Neighbourhood guides" : "Selling tips & strategies"}</strong></div>
</div>
<p style="font-size:15px;color:#3a3a5c;line-height:1.6;margin:0 0 16px;">Feel free to reply to this email anytime — I'm here to help!</p>
<p style="font-size:15px;color:#3a3a5c;margin:0;">Best regards,<br><strong>Your Realtor</strong></p>
</div>
<hr style="border-color:#e8e5f5;margin:0;">
<div style="padding:20px 32px;text-align:center;">
<p style="font-size:11px;color:#a0a0b0;margin:0;"><a href="#" style="color:#a0a0b0;text-decoration:underline;">Unsubscribe</a></p>
</div></div></body></html>`;

      await supabase.from("newsletters").insert({
        contact_id: data.id,
        subject: welcomeSubject,
        email_type: "welcome",
        status: "draft",
        html_body: welcomeHtml,
        ai_context: { journey_phase: "lead", contact_type: data.type, auto_generated: true },
      });
    }
  } catch {
    // Don't fail contact creation if journey enrollment fails
  }

  // Fire new_lead trigger for workflow auto-enrollment
  try {
    const { fireTrigger } = await import("@/lib/workflow-triggers");
    await fireTrigger({
      type: "new_lead",
      contactId: data.id,
      contactType: data.type,
    });
  } catch {
    // Don't fail contact creation if trigger fails
  }

  revalidatePath("/newsletters");

  return { success: true, contact: data };
}

export async function updateContact(
  id: string,
  formData: Partial<ContactFormData> & {
    family_members?: Json;
    buyer_preferences?: Json;
    seller_preferences?: Json;
    demographics?: Json;
    lifecycle_stage?: string;
    tags?: Json;
    stage_bar?: string;
    household_id?: string | null;
  }
) {
  const supabase = createAdminClient();

  // Fetch current contact for trigger comparison and consistency enforcement
  const needsConsistency =
    formData.type !== undefined ||
    formData.lead_status !== undefined ||
    formData.stage_bar !== undefined ||
    formData.tags !== undefined;

  let oldContact: {
    type: string;
    lead_status: string;
    stage_bar: string | null;
    tags: Json;
  } | null = null;

  if (needsConsistency) {
    const { data } = await supabase
      .from("contacts")
      .select("type, lead_status, stage_bar, tags")
      .eq("id", id)
      .single();
    oldContact = data;
  }

  // Build update payload, only include defined fields
  const updatePayload: Record<string, unknown> = {};
  if (formData.name !== undefined) updatePayload.name = formData.name;
  if (formData.phone !== undefined) updatePayload.phone = formData.phone;
  if (formData.email !== undefined) updatePayload.email = formData.email || null;
  if (formData.type !== undefined) updatePayload.type = formData.type;
  if (formData.pref_channel !== undefined) updatePayload.pref_channel = formData.pref_channel;
  if (formData.notes !== undefined) updatePayload.notes = formData.notes || null;
  if (formData.address !== undefined) updatePayload.address = formData.address || null;
  if (formData.referred_by_id !== undefined) updatePayload.referred_by_id = formData.referred_by_id || null;
  if (formData.family_members !== undefined) updatePayload.family_members = formData.family_members;
  if (formData.buyer_preferences !== undefined) updatePayload.buyer_preferences = formData.buyer_preferences;
  if (formData.seller_preferences !== undefined) updatePayload.seller_preferences = formData.seller_preferences;
  if (formData.demographics !== undefined) updatePayload.demographics = formData.demographics;
  if (formData.lifecycle_stage !== undefined) updatePayload.lifecycle_stage = formData.lifecycle_stage;
  if (formData.source !== undefined) updatePayload.source = formData.source || null;
  if (formData.lead_status !== undefined) updatePayload.lead_status = formData.lead_status;
  if (formData.tags !== undefined) updatePayload.tags = formData.tags;
  if (formData.stage_bar !== undefined) updatePayload.stage_bar = formData.stage_bar;
  if (formData.household_id !== undefined) updatePayload.household_id = formData.household_id;
  if (formData.partner_type !== undefined) updatePayload.partner_type = formData.partner_type || null;
  if (formData.company_name !== undefined) updatePayload.company_name = formData.company_name || null;
  if (formData.job_title !== undefined) updatePayload.job_title = formData.job_title || null;
  if (formData.typical_client_profile !== undefined) updatePayload.typical_client_profile = formData.typical_client_profile || null;
  if (formData.referral_agreement_terms !== undefined) updatePayload.referral_agreement_terms = formData.referral_agreement_terms || null;

  // Enforce cross-field consistency (stage↔status, type↔stage, tags)
  if (oldContact && needsConsistency) {
    const cleanPayload = enforceConsistency(
      {
        type: oldContact.type,
        lead_status: oldContact.lead_status,
        stage_bar: oldContact.stage_bar,
        tags: oldContact.tags,
      },
      updatePayload
    );
    Object.assign(updatePayload, cleanPayload);
  }

  const { error } = await supabase
    .from("contacts")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: "Failed to update contact" };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);

  // Fire workflow triggers for status/tag changes
  try {
    const { fireTrigger } = await import("@/lib/workflow-triggers");

    // Lead status change trigger
    if (
      formData.lead_status !== undefined &&
      oldContact &&
      formData.lead_status !== oldContact.lead_status
    ) {
      await fireTrigger({
        type: "lead_status_change",
        contactId: id,
        data: {
          oldStatus: oldContact.lead_status,
          newStatus: formData.lead_status,
        },
      });
    }

    // Tag added trigger
    if (formData.tags !== undefined && oldContact) {
      const oldTags = Array.isArray(oldContact.tags)
        ? (oldContact.tags as string[])
        : [];
      const newTags = Array.isArray(formData.tags)
        ? (formData.tags as string[])
        : [];
      const addedTags = newTags.filter((t) => !oldTags.includes(t));
      for (const tag of addedTags) {
        await fireTrigger({
          type: "tag_added",
          contactId: id,
          data: { tag },
        });
      }
    }
  } catch {
    // Don't fail update if triggers fail
  }

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

// ── Contact Dates CRUD ──────────────────────────────────────

export async function addContactDate(
  contactId: string,
  data: { label: string; date: string; recurring: boolean; notes?: string }
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("contact_dates").insert({
    contact_id: contactId,
    label: data.label,
    date: data.date,
    recurring: data.recurring,
    notes: data.notes || null,
  });

  if (error) {
    return { error: "Failed to add date" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function updateContactDate(
  dateId: string,
  contactId: string,
  data: Partial<{ label: string; date: string; recurring: boolean; notes: string }>
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contact_dates")
    .update(data)
    .eq("id", dateId);

  if (error) {
    return { error: "Failed to update date" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function deleteContactDate(dateId: string, contactId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contact_dates")
    .delete()
    .eq("id", dateId);

  if (error) {
    return { error: "Failed to delete date" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

// ── Quick Action: Send Message ───────────────────────────────

export async function sendContactMessage(contactId: string, body: string) {
  const supabase = createAdminClient();

  // Fetch contact to get phone and channel
  const { data: contact, error: fetchError } = await supabase
    .from("contacts")
    .select("phone, pref_channel")
    .eq("id", contactId)
    .single();

  if (fetchError || !contact) {
    return { error: "Contact not found" };
  }

  try {
    const { sendGenericMessage } = await import("@/lib/twilio");
    await sendGenericMessage({
      to: contact.phone,
      channel: contact.pref_channel as "whatsapp" | "sms",
      body,
    });
  } catch {
    return { error: "Failed to send message via Twilio" };
  }

  // Log to communications
  const { error: logError } = await supabase.from("communications").insert({
    contact_id: contactId,
    direction: "outbound",
    channel: contact.pref_channel,
    body,
  });

  if (logError) {
    return { error: "Message sent but failed to log" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

// ── Quick Action: Send Email via Gmail ───────────────────────

export async function sendContactEmail(
  contactId: string,
  subject: string,
  body: string
) {
  const supabase = createAdminClient();

  const { data: contact, error: fetchError } = await supabase
    .from("contacts")
    .select("email")
    .eq("id", contactId)
    .single();

  if (fetchError || !contact?.email) {
    return { error: "Contact has no email address" };
  }

  try {
    const { sendEmail } = await import("@/lib/gmail");
    await sendEmail({ to: contact.email, subject, body });
  } catch (err) {
    return { error: `Failed to send email: ${String(err)}` };
  }

  // Log to communications
  await supabase.from("communications").insert({
    contact_id: contactId,
    direction: "outbound",
    channel: "email",
    body: `Subject: ${subject}\n\n${body}`,
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

// ── Gmail Sync ──────────────────────────────────────────────

export async function syncContactEmailHistory(contactId: string) {
  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("email")
    .eq("id", contactId)
    .single();

  if (!contact?.email) {
    return { error: "Contact has no email address" };
  }

  try {
    const { syncContactEmails } = await import("@/lib/gmail");
    const result = await syncContactEmails(contactId, contact.email);
    revalidatePath(`/contacts/${contactId}`);
    return { success: true, imported: result.imported, errors: result.errors };
  } catch (err) {
    return { error: `Gmail sync failed: ${String(err)}` };
  }
}

// ── Contact Tasks CRUD ───────────────────────────────────────

export async function createContactTask(
  contactId: string,
  data: {
    title: string;
    due_date?: string;
    priority?: string;
    category?: string;
    notes?: string;
  }
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").insert({
    contact_id: contactId,
    title: data.title,
    due_date: data.due_date || null,
    priority: data.priority || "medium",
    category: data.category || "general",
    notes: data.notes || null,
    status: "pending",
  });

  if (error) {
    return { error: "Failed to create task" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function updateContactTask(
  taskId: string,
  contactId: string,
  data: Partial<{
    title: string;
    due_date: string | null;
    priority: string;
    category: string;
    notes: string | null;
    status: string;
    completed_at: string | null;
  }>
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tasks")
    .update(data)
    .eq("id", taskId);

  if (error) {
    return { error: "Failed to update task" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function deleteContactTask(taskId: string, contactId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    return { error: "Failed to delete task" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

// ── Contact Documents ────────────────────────────────────────

export async function deleteContactDocument(docId: string, contactId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contact_documents")
    .delete()
    .eq("id", docId);

  if (error) {
    return { error: "Failed to delete document" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}
