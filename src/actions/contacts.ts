"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { contactSchema, type ContactFormData } from "@/lib/schemas";
import type { Json } from "@/types/database";
import { enforceConsistency } from "@/lib/contact-consistency";

export async function createContact(formData: ContactFormData, force = false) {
  const parsed = contactSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data", issues: parsed.error.issues };
  }

  const supabase = createAdminClient();

  if (!force) {
    // Strip non-digit characters and take the last 10 digits for phone comparison
    const rawPhone = (parsed.data.phone ?? "").replace(/\D/g, "");
    const last10 = rawPhone.slice(-10);

    const { data: existing } = await supabase
      .from("contacts")
      .select("id, name, phone, email");

    if (existing && existing.length > 0) {
      const duplicates = existing.filter((c) => {
        const phoneMatch =
          last10.length === 10 &&
          (c.phone ?? "").replace(/\D/g, "").slice(-10) === last10;
        const emailMatch =
          parsed.data.email &&
          c.email &&
          c.email.toLowerCase() === parsed.data.email.toLowerCase();
        return phoneMatch || emailMatch;
      });

      if (duplicates.length > 0) {
        return {
          error: "Duplicate contact detected",
          duplicates: duplicates.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
          })),
        };
      }
    }
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

  // Fire-and-forget: auto-enroll in workflows (e.g. speed_to_contact)
  // and create agent notification via workflow-triggers
  import("@/lib/workflow-triggers")
    .then(({ fireTrigger }) =>
      fireTrigger({
        type: "new_lead",
        contactId: data.id,
        contactType: data.type,
      })
    )
    .catch(() => {
      // Don't fail contact creation if trigger fails
    });

  // Auto-enroll in journey + generate welcome email draft
  autoEnrollAndWelcome(data.id, data.type, data.name, data.email, data.notes).catch(() => {
    // Don't fail contact creation if journey enrollment fails
  });

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

// ── Delete Contact ───────────────────────────────────────────

export async function deleteContact(id: string) {
  if (!id) {
    return { error: "Invalid contact ID" };
  }

  const supabase = createAdminClient();

  // Check for active listings where this contact is the seller
  const { data: activeListings, error: listingsError } = await supabase
    .from("listings")
    .select("id, status")
    .eq("seller_id", id)
    .not("status", "in", "(sold,cancelled)");

  if (listingsError) {
    return { error: "Failed to check contact listings" };
  }

  if (activeListings && activeListings.length > 0) {
    return { error: "Cannot delete contact with active listings" };
  }

  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete contact" };
  }

  revalidatePath("/contacts");
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

// ── Auto Journey Enrollment + Welcome Email ──────────────────

async function autoEnrollAndWelcome(
  contactId: string,
  contactType: string,
  name: string,
  email: string | null,
  notes: string | null
) {
  const supabase = createAdminClient();
  const journeyType = contactType === "seller" ? "seller" : "buyer";

  // 1. Check if already enrolled
  const { data: existing } = await supabase
    .from("contact_journeys")
    .select("id")
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType)
    .limit(1);

  if (existing && existing.length > 0) return;

  // 2. Enroll in journey
  const nextEmailAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("contact_journeys").insert({
    contact_id: contactId,
    journey_type: journeyType,
    current_phase: "lead",
    is_paused: false,
    next_email_at: nextEmailAt,
    send_mode: "review",
  });

  // 3. Generate welcome email draft (skip if no email address)
  if (!email) return;

  const firstName = name?.split(" ")[0] || "there";

  // Extract context from notes for personalization
  const areaMatch = notes?.match(/(?:in|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const area = areaMatch?.[1] || "Vancouver";
  const budgetMatch = notes?.match(/\$?([\d,]+)[Kk]?\s*[-\u2013]\s*\$?([\d,]+)[Kk]?/);
  const budget = budgetMatch ? `$${budgetMatch[1]}K - $${budgetMatch[2]}K` : null;

  // Use Apple-quality block-based email builder with pre-send checks + dynamic brand
  const { assembleEmail, runPreSendChecks, getBrandConfig } = await import("@/lib/email-blocks");
  const brand = await getBrandConfig();
  const isBuyer = journeyType === "buyer";
  let subject = isBuyer
    ? `Welcome! Let's find your dream home${area !== "Vancouver" ? " in " + area : ""}`
    : `Let's get your home sold — here's the plan`;
  let introText = isBuyer
    ? `I'm excited to help you find your perfect home${area !== "Vancouver" ? " in " + area : ""}. I'll be sending you personalized listing alerts, neighbourhood guides, and market updates${budget ? " matched to your " + budget + " budget" : ""}.`
    : `Thank you for considering me to help sell your property. I'll keep you updated with showing reports, market data, and comparable sales to ensure we get you the best price.`;

  // Run pre-send text checks
  const checks = await runPreSendChecks(subject, introText, contactId, name || "there", contactType, "welcome");
  subject = checks.subject;
  introText = checks.body;

  const htmlBody = assembleEmail("welcome", {
    contact: { name: name || "there", firstName, type: contactType },
    agent: brand,
    content: {
      subject,
      intro: introText,
      body: "Feel free to reply to this email anytime — I'm here to help!",
      ctaText: isBuyer ? "View Listings" : "Get Started",
    },
  });

  await supabase.from("newsletters").insert({
    contact_id: contactId,
    subject,
    email_type: "welcome",
    status: "draft",
    html_body: htmlBody,
    ai_context: {
      journey_phase: "lead",
      contact_type: contactType,
      auto_generated: true,
      area,
      budget,
      reasoning: area
        ? `Welcome email for new ${contactType} lead interested in ${area}${budget ? ` with budget $${budget}` : ""}. Using personalized template with area-specific content.`
        : `Welcome email for new ${contactType} lead. Using generic welcome template — no area preferences specified yet.`,
    },
  });
}
