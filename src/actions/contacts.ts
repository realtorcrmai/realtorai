"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";
import { contactSchema, type ContactFormData } from "@/lib/schemas";
import type { Json } from "@/types/database";
import { enforceConsistency, validateStageForType } from "@/lib/contact-consistency";
import { triggerIngest } from "@/lib/rag/realtime-ingest";
import { createNotification } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";

export async function getContactCommunications(contactId: string, limit = 50) {
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc
    .from("communications")
    .select("id, direction, channel, body, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function createContact(formData: ContactFormData, force = false) {
  const parsed = contactSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Invalid form data", issues: parsed.error.issues };
  }

  const tc = await getAuthenticatedTenantClient();

  if (!force) {
    // Strip non-digit characters and take the last 10 digits for phone comparison
    const rawPhone = (parsed.data.phone ?? "").replace(/\D/g, "");
    const last10 = rawPhone.slice(-10);

    const { data: existing } = await tc
      .from("contacts")
      .select("id, name, phone, email");

    if (existing && existing.length > 0) {
      const duplicates = existing.filter((c: { phone?: string | null; email?: string | null; id: string; name: string }) => {
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
          duplicates: duplicates.map((c: { id: string; name: string; phone?: string | null; email?: string | null }) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
          })),
        };
      }
    }
  }

  const { data, error } = await tc
    .from("contacts")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      type: parsed.data.type,
      pref_channel: parsed.data.pref_channel,
      notes: parsed.data.notes || null,
      address: parsed.data.address || null,
      postal_code: parsed.data.postal_code || null,
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
      social_profiles: (parsed.data.social_profiles as Json) ?? null,
    })
    .select()
    .single();

  if (error) {
    return { error: "Failed to create contact" };
  }

  trackEvent('feature_used', tc.realtorId, { feature: 'contacts', action: 'create' });

  // Notification: new lead added
  try {
    await createNotification(tc.realtorId, {
      type: "new_lead",
      title: `New lead: ${parsed.data.name}`,
      body: `${parsed.data.type} contact added`,
      related_type: "contact",
      related_id: data.id,
    });
  } catch {
    // Don't fail contact creation if notification fails
  }

  revalidatePath("/contacts");

  // Fire-and-forget: enroll in journey + trigger matching workflows
  // Journey tracks phase (lead → active → contract → closed)
  // Auto-enroll in journey (phase tracking only — no emails sent)
  // Speed-to-Contact workflow is INACTIVE by default — realtor enables manually
  // and enrolls contacts through the Automations UI (/automations/workflows/{id})
  (async () => {
    try {
      await enrollInJourney(data.id, data.type, data.name);
    } catch {
      // Don't fail contact creation if enrollment fails
    }
  })();

  revalidatePath("/newsletters");

  // Real-time RAG ingestion
  triggerIngest("contacts", data.id);

  // Auto-cleanup: remove sample contacts once user has 5+ real contacts
  (async () => {
    try {
      const { count } = await tc
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("is_sample", false);
      if ((count ?? 0) >= 5) {
        await tc.from("contacts").delete().eq("is_sample", true);
      }
    } catch { /* non-critical */ }
  })();

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
  const tc = await getAuthenticatedTenantClient();

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
    const { data } = await tc
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
  if (formData.postal_code !== undefined) updatePayload.postal_code = formData.postal_code || null;
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
  if (formData.social_profiles !== undefined) updatePayload.social_profiles = formData.social_profiles || null;

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

  const { error } = await tc
    .from("contacts")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: "Failed to update contact" };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);

  // Sync address → primary residence portfolio entry
  if (formData.address) {
    try {
      const { upsertPrimaryResidence } = await import("@/actions/contact-portfolio");
      await upsertPrimaryResidence(id, formData.address);
    } catch {
      // Non-critical — don't fail the contact update
    }
  }

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

  // Real-time RAG re-ingestion
  triggerIngest("contacts", id);

  return { success: true };
}

export async function addCommunicationNote(
  contactId: string,
  body: string
) {
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc.from("communications").insert({
    contact_id: contactId,
    direction: "outbound",
    channel: "note",
    body,
  });

  if (error) {
    return { error: "Failed to add note" };
  }

  revalidatePath(`/contacts/${contactId}`);
  // Re-ingest contact profile with new communication data
  triggerIngest("contacts", contactId);
  return { success: true };
}

// ── Contact Dates CRUD ──────────────────────────────────────

export async function addContactDate(
  contactId: string,
  data: { label: string; date: string; recurring: boolean; notes?: string }
) {
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc.from("contact_dates").insert({
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
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc
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
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc
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
  const tc = await getAuthenticatedTenantClient();

  // Fetch contact to get phone and channel
  const { data: contact, error: fetchError } = await tc
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
  const { error: logError } = await tc.from("communications").insert({
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
  const tc = await getAuthenticatedTenantClient();

  const { data: contact, error: fetchError } = await tc
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
  await tc.from("communications").insert({
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
  const tc = await getAuthenticatedTenantClient();

  const { data: contact } = await tc
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
    description?: string;
  }
) {
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc.from("tasks").insert({
    contact_id: contactId,
    title: data.title,
    due_date: data.due_date || null,
    priority: data.priority || "medium",
    category: data.category || "general",
    description: data.description || null,
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
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc
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
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc.from("tasks").delete().eq("id", taskId);

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

  const tc = await getAuthenticatedTenantClient();

  // Check for active listings where this contact is the seller
  const { data: activeListings, error: listingsError } = await tc
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

  const { error } = await tc.from("contacts").delete().eq("id", id);

  if (error) {
    return { error: "Failed to delete contact" };
  }

  revalidatePath("/contacts");
  return { success: true };
}

// ── Contact Documents ────────────────────────────────────────

export async function deleteContactDocument(docId: string, contactId: string) {
  const tc = await getAuthenticatedTenantClient();
  const { error } = await tc
    .from("contact_documents")
    .delete()
    .eq("id", docId);

  if (error) {
    return { error: "Failed to delete document" };
  }

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

// ── Convert Contact Type ─────────────────────────────────────

/**
 * Convert a customer (lead) to buyer or seller.
 * - Updates contact type
 * - Enrolls in appropriate journey (buyer or seller)
 * - Fires trigger for matching workflows (e.g., Buyer Nurture)
 */
export async function convertContactType(
  contactId: string,
  newType: "buyer" | "seller"
) {
  const tc = await getAuthenticatedTenantClient();

  const { data: contact } = await tc
    .from("contacts")
    .select("id, name, type")
    .eq("id", contactId)
    .single();

  if (!contact) return { error: "Contact not found" };

  // Update type
  const { error } = await tc
    .from("contacts")
    .update({ type: newType, lead_status: "qualified" })
    .eq("id", contactId);

  if (error) return { error: error.message };

  // Re-enroll in correct journey
  try {
    await enrollInJourney(contactId, newType, contact.name);
  } catch {}

  // Fire trigger for workflow enrollment (e.g., Buyer Nurture)
  try {
    const { fireTrigger } = await import("@/lib/trigger-engine");
    await fireTrigger("lead_status_change", contactId, { contactType: newType });
  } catch {}

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  revalidatePath("/newsletters");
  return { success: true, newType };
}

// ── Auto Journey Enrollment + Welcome Email ──────────────────

/**
 * Enroll contact in journey (phase tracking only — no welcome email).
 * Welcome email comes from the "Speed to Contact" workflow via trigger engine.
 */
async function enrollInJourney(contactId: string, contactType: string, _name: string) {
  // Only buyer/seller have journey support — DB constraint rejects other types
  if (contactType !== "buyer" && contactType !== "seller") return;

  const tc = await getAuthenticatedTenantClient();
  const journeyType = contactType;

  // Check if already enrolled
  const { data: existing } = await tc
    .from("contact_journeys")
    .select("id")
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType)
    .maybeSingle();

  if (existing) return; // Already enrolled

  await tc.from("contact_journeys").insert({
    contact_id: contactId,
    journey_type: journeyType,
    current_phase: "lead",
    phase_entered_at: new Date().toISOString(),
    next_email_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    emails_sent_in_phase: 0,
    send_mode: "review",
    is_paused: false,
    agent_mode: "schedule",
    trust_level: 0,
  });

  console.log(`[journey] Enrolled ${_name} in ${journeyType} journey (lead phase)`);
}

/** @deprecated Use enrollInJourney + trigger engine instead */
async function autoEnrollAndWelcome(
  contactId: string,
  contactType: string,
  name: string,
  email: string | null,
  notes: string | null
) {
  const tc = await getAuthenticatedTenantClient();
  const journeyType = contactType === "seller" ? "seller" : "buyer";

  // 1. Check if already enrolled
  const { data: existing } = await tc
    .from("contact_journeys")
    .select("id")
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType)
    .limit(1);

  if (existing && existing.length > 0) return;

  // 2. Enroll in journey
  const nextEmailAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  await tc.from("contact_journeys").insert({
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

  await tc.from("newsletters").insert({
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

// ============================================================
// computeLifecycleStage
// Derives and persists the contact's lifecycle_stage from their
// current roles and active transactions. Called after any mutation
// that could change stage (journey create/close, listing create/close, role change).
// ============================================================

type LifecycleStage =
  | "prospect" | "nurture" | "active_buyer" | "active_seller"
  | "dual_client" | "under_contract" | "closed" | "past_client" | "referral_partner";

export async function computeLifecycleStage(
  contactId: string,
  realtorId: string
): Promise<{ stage: LifecycleStage; error: string | null }> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();

    // Load contact roles
    const { data: contact } = await supabase
      .from("contacts")
      .select("roles, lifecycle_stage")
      .eq("id", contactId)
      .eq("realtor_id", realtorId)
      .single();

    if (!contact) return { stage: "prospect", error: "Contact not found" };

    const roles: string[] = (contact as { roles: string[] }).roles ?? [];

    // referral_partner takes precedence over everything
    if (roles.includes("referral_partner")) {
      await _persistStage(supabase, contactId, realtorId, "referral_partner");
      return { stage: "referral_partner", error: null };
    }

    // Check active buyer journeys
    const { data: journeys } = await supabase
      .from("buyer_journeys")
      .select("status")
      .eq("contact_id", contactId)
      .eq("realtor_id", realtorId)
      .not("status", "in", '("closed","cancelled","paused")');

    const activeJourneys = journeys ?? [];
    const underContractJourney = activeJourneys.some((j: { status: string }) =>
      ["conditional", "firm"].includes(j.status)
    );

    // Check active seller listings
    const { data: listings } = await supabase
      .from("listings")
      .select("status")
      .eq("seller_id", contactId)
      .eq("realtor_id", realtorId)
      .not("status", "in", '("sold","expired","withdrawn")');

    const activeListing = (listings ?? []).length > 0;

    // Check all transactions closed
    const { data: allJourneys } = await supabase
      .from("buyer_journeys")
      .select("status")
      .eq("contact_id", contactId)
      .eq("realtor_id", realtorId);

    const { data: allListings } = await supabase
      .from("listings")
      .select("status")
      .eq("seller_id", contactId)
      .eq("realtor_id", realtorId);

    const hadTransactions =
      (allJourneys ?? []).length > 0 || (allListings ?? []).length > 0;
    const allClosed =
      hadTransactions &&
      (allJourneys ?? []).every((j: { status: string }) =>
        ["closed", "cancelled"].includes(j.status)
      ) &&
      (allListings ?? []).every((l: { status: string }) =>
        ["sold", "expired", "withdrawn"].includes(l.status)
      );

    let stage: LifecycleStage = "prospect";

    if (underContractJourney) {
      stage = "under_contract";
    } else if (allClosed && hadTransactions) {
      stage = "past_client";
    } else {
      const isBuyer = activeJourneys.length > 0 || roles.includes("buyer");
      const isSeller = activeListing || roles.includes("seller");

      if (isBuyer && isSeller) {
        stage = "dual_client";
      } else if (isBuyer) {
        stage = "active_buyer";
      } else if (isSeller) {
        stage = "active_seller";
      } else if (hadTransactions) {
        stage = "nurture";
      }
    }

    await _persistStage(supabase, contactId, realtorId, stage);
    return { stage, error: null };
  } catch (err) {
    return { stage: "prospect", error: String(err) };
  }
}

async function _persistStage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contactId: string,
  realtorId: string,
  stage: LifecycleStage
): Promise<void> {
  await supabase
    .from("contacts")
    .update({ lifecycle_stage: stage, updated_at: new Date().toISOString() })
    .eq("id", contactId)
    .eq("realtor_id", realtorId);
}

// ============================================================
// setLifecycleStage — manual override
// ============================================================

export async function setLifecycleStage(
  contactId: string,
  stage: LifecycleStage
): Promise<{ error: string | null }> {
  try {
    const tc = await getAuthenticatedTenantClient();

    const { error } = await tc
      .from("contacts")
      .update({ lifecycle_stage: stage, updated_at: new Date().toISOString() })
      .eq("id", contactId);

    if (error) return { error: error.message };

    revalidatePath(`/contacts/${contactId}`);
    revalidatePath("/contacts");

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ── Bulk Operations ──────────────────────────────────────────────────────

const VALID_STAGES = ["new", "qualified", "active_search", "active_listing", "under_contract", "closed", "cold"];

export async function bulkUpdateContactStage(contactIds: string[], stage: string) {
  if (!VALID_STAGES.includes(stage)) return { error: `Invalid stage: ${stage}` };
  if (contactIds.length === 0) return { error: "No contacts selected" };
  const tc = await getAuthenticatedTenantClient();

  // Validate stage is compatible with each contact's type
  const { data: contacts } = await tc.raw
    .from("contacts")
    .select("id, type")
    .eq("realtor_id", tc.realtorId)
    .in("id", contactIds);

  const validIds: string[] = [];
  let skipped = 0;
  for (const c of contacts ?? []) {
    const validated = validateStageForType(c.type as Parameters<typeof validateStageForType>[0], stage);
    if (validated === stage) {
      validIds.push(c.id);
    } else {
      skipped++;
    }
  }

  if (validIds.length === 0) return { error: `Stage "${stage}" is not valid for the selected contact types.` };

  const { error } = await tc.raw
    .from("contacts")
    .update({ stage_bar: stage, updated_at: new Date().toISOString() })
    .eq("realtor_id", tc.realtorId)
    .in("id", validIds);

  if (error) return { error: error.message };
  revalidatePath("/contacts");
  return { error: null, updated: validIds.length, skipped };
}

export async function bulkDeleteContacts(contactIds: string[]) {
  if (contactIds.length === 0) return { error: "No contacts selected" };
  const tc = await getAuthenticatedTenantClient();

  // Check for active listings linked to any of these contacts
  const { data: linkedListings } = await tc.raw
    .from("listings")
    .select("id, seller_id")
    .eq("realtor_id", tc.realtorId)
    .in("seller_id", contactIds)
    .neq("status", "sold").neq("status", "expired").neq("status", "withdrawn");

  if (linkedListings && linkedListings.length > 0) {
    return { error: `Cannot delete: ${linkedListings.length} contact(s) have active listings.` };
  }

  const { error } = await tc.raw
    .from("contacts")
    .delete()
    .eq("realtor_id", tc.realtorId)
    .in("id", contactIds);

  if (error) return { error: error.message };
  revalidatePath("/contacts");
  return { error: null, deleted: contactIds.length };
}

export async function bulkExportContacts(contactIds: string[]) {
  if (contactIds.length === 0) return { error: "No contacts selected", csv: "" };
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc.raw
    .from("contacts")
    .select("name, email, phone, type, stage_bar, lead_status, created_at")
    .eq("realtor_id", tc.realtorId)
    .in("id", contactIds);

  if (!data) return { error: "Failed to fetch contacts", csv: "" };

  const headers = ["Name", "Email", "Phone", "Type", "Stage", "Lead Status", "Created"];
  const escapeField = (val: unknown) => {
    const str = String(val ?? "");
    // Prevent CSV formula injection and handle special characters
    if (/[,"\n\r]/.test(str) || /^[=+@\-]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = data.map((c: Record<string, unknown>) =>
    [c.name, c.email, c.phone, c.type, c.stage_bar, c.lead_status, c.created_at].map(escapeField).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  return { error: null, csv };
}

// ── Unsubscribe / Re-subscribe (public — uses admin client, no auth required) ──

/**
 * Mark a contact as unsubscribed from newsletters.
 * Validates the HMAC-signed token before touching the DB.
 * Uses admin client because this route is public (no session).
 */
export async function unsubscribeContact(
  token: string
): Promise<{ success: boolean; contactId?: string; email?: string; agentName?: string; error?: string }> {
  const { verifyUnsubscribeToken } = await import("@/lib/unsubscribe-token");
  const contactId = verifyUnsubscribeToken(token);
  if (!contactId) {
    return { success: false, error: "Invalid or expired unsubscribe link." };
  }

  const supabase = createAdminClient();

  const { data: contact, error: fetchErr } = await supabase
    .from("contacts")
    .select("id, email, realtor_id")
    .eq("id", contactId)
    .single();

  if (fetchErr || !contact) {
    return { success: false, error: "Contact not found." };
  }

  const { error: updateErr } = await supabase
    .from("contacts")
    .update({ newsletter_unsubscribed: true } as Record<string, unknown>)
    .eq("id", contactId);

  if (updateErr) {
    return { success: false, error: "Failed to process unsubscribe request." };
  }

  // Pause all active journeys for this contact
  await supabase
    .from("contact_journeys")
    .update({ is_paused: true, pause_reason: "unsubscribed" })
    .eq("contact_id", contactId)
    .eq("is_paused", false);

  // Fetch realtor name for the confirmation page
  let agentName: string | undefined;
  if (contact.realtor_id) {
    const { data: user } = await supabase
      .from("users")
      .select("name")
      .eq("id", contact.realtor_id)
      .single();
    agentName = user?.name ?? undefined;
  }

  return {
    success: true,
    contactId: contact.id,
    email: contact.email ?? undefined,
    agentName,
  };
}

/**
 * Re-subscribe a contact to newsletters.
 * Validates the same HMAC-signed token.
 */
export async function resubscribeContact(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const { verifyUnsubscribeToken } = await import("@/lib/unsubscribe-token");
  const contactId = verifyUnsubscribeToken(token);
  if (!contactId) {
    return { success: false, error: "Invalid or expired link." };
  }

  const supabase = createAdminClient();

  const { error: updateErr } = await supabase
    .from("contacts")
    .update({ newsletter_unsubscribed: false } as Record<string, unknown>)
    .eq("id", contactId);

  if (updateErr) {
    return { success: false, error: "Failed to re-subscribe. Please try again." };
  }

  // Resume paused journeys that were paused due to unsubscribe
  await supabase
    .from("contact_journeys")
    .update({ is_paused: false, pause_reason: null })
    .eq("contact_id", contactId)
    .eq("pause_reason", "unsubscribed");

  return { success: true };
}
