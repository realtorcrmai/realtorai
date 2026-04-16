"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { canSendToContact } from "@/lib/compliance/can-send";
import { revalidatePath } from "next/cache";

type JourneyType = "buyer" | "seller" | "customer" | "agent";
type JourneyPhase = "lead" | "active" | "under_contract" | "past_client" | "dormant";

// Journey phase email schedules (delays in hours)
const JOURNEY_SCHEDULES: Record<JourneyType, Record<JourneyPhase, Array<{ emailType: string; delayHours: number }>>> = {
  buyer: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "neighbourhood_guide", delayHours: 72 },
      { emailType: "new_listing_alert", delayHours: 168 },
      { emailType: "market_update", delayHours: 336 },
      { emailType: "new_listing_alert", delayHours: 504 },
    ],
    active: [
      { emailType: "new_listing_alert", delayHours: 168 },
      { emailType: "market_update", delayHours: 504 },
    ],
    under_contract: [
      { emailType: "neighbourhood_guide", delayHours: 48 },
    ],
    past_client: [
      { emailType: "home_anniversary", delayHours: 720 },
      { emailType: "market_update", delayHours: 2160 },
      { emailType: "referral_ask", delayHours: 4320 },
      { emailType: "home_anniversary", delayHours: 8760 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
      { emailType: "market_update", delayHours: 336 },
    ],
  },
  seller: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "market_update", delayHours: 72 },
      { emailType: "neighbourhood_guide", delayHours: 168 },
    ],
    active: [
      { emailType: "market_update", delayHours: 168 },
    ],
    under_contract: [
      { emailType: "closing_checklist", delayHours: 0 },
      { emailType: "inspection_reminder", delayHours: 72 },
      { emailType: "closing_countdown", delayHours: 168 },
    ],
    past_client: [
      { emailType: "market_update", delayHours: 720 },
      { emailType: "referral_ask", delayHours: 2160 },
      { emailType: "home_anniversary", delayHours: 8760 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
      { emailType: "market_update", delayHours: 336 },
    ],
  },
  customer: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "market_update", delayHours: 168 },
    ],
    active: [
      { emailType: "market_update", delayHours: 504 },
    ],
    under_contract: [],
    past_client: [
      { emailType: "market_update", delayHours: 720 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
    ],
  },
  agent: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
    ],
    active: [],
    under_contract: [],
    past_client: [],
    dormant: [],
  },
};

export async function enrollContactInJourney(contactId: string, journeyType: JourneyType) {
  const tc = await getAuthenticatedTenantClient();

  // Validate contact type matches journey type
  const { data: contact } = await tc.from("contacts").select("type").eq("id", contactId).single();
  if (contact && journeyType === "buyer" && !["buyer", "customer"].includes(contact.type)) {
    console.warn(`[journeys] Contact ${contactId} type=${contact.type} enrolled in buyer journey — mismatch`);
  }
  if (contact && journeyType === "seller" && contact.type !== "seller") {
    console.warn(`[journeys] Contact ${contactId} type=${contact.type} enrolled in seller journey — mismatch`);
  }

  // Get first email schedule
  const schedule = JOURNEY_SCHEDULES[journeyType].lead;
  const nextEmailAt = schedule.length > 0
    ? new Date(Date.now() + schedule[0].delayHours * 3600000).toISOString()
    : null;

  const { data, error } = await tc
    .from("contact_journeys")
    .upsert(
      {
        contact_id: contactId,
        journey_type: journeyType,
        current_phase: "lead",
        next_email_at: nextEmailAt,
        emails_sent_in_phase: 0,
      },
      { onConflict: "contact_id,journey_type", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  // ignoreDuplicates: if row already existed, select() returns null
  if (!data) return { error: "Contact already enrolled in this journey" };

  revalidatePath("/newsletters");
  return { data };
}

export async function advanceJourneyPhase(
  contactId: string,
  journeyType: JourneyType,
  newPhase: JourneyPhase
) {
  const tc = await getAuthenticatedTenantClient();

  // Capture old phase for audit log
  const { data: currentJourney } = await tc
    .from("contact_journeys")
    .select("current_phase")
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType)
    .single();
  const oldPhase = currentJourney?.current_phase ?? "unknown";

  const schedule = JOURNEY_SCHEDULES[journeyType][newPhase];
  const nextEmailAt = schedule.length > 0
    ? new Date(Date.now() + schedule[0].delayHours * 3600000).toISOString()
    : null;

  const { error } = await tc
    .from("contact_journeys")
    .update({
      current_phase: newPhase,
      phase_entered_at: new Date().toISOString(),
      next_email_at: nextEmailAt,
      emails_sent_in_phase: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType);

  if (error) return { error: error.message };

  // Audit log — non-blocking
  try {
    await tc.from("communications").insert({
      contact_id: contactId,
      direction: "internal",
      channel: "system",
      body: `Journey phase advanced: ${oldPhase} → ${newPhase} (${journeyType})`,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Don't fail phase advancement if audit log fails
  }

  // Fire phase_changed trigger — pauses irrelevant workflows, enrolls new ones
  try {
    const { fireTrigger } = await import("@/lib/trigger-engine");
    await fireTrigger("phase_changed", contactId, {
      contactType: journeyType,
      newPhase,
    });
  } catch {
    // Don't fail phase advancement if trigger fails
  }

  revalidatePath("/newsletters");
  return { success: true };
}

export async function pauseJourney(contactId: string, journeyType: JourneyType, reason?: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("contact_journeys")
    .update({
      is_paused: true,
      pause_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType);

  if (error) return { error: error.message };
  revalidatePath("/newsletters");
  return { success: true };
}

export async function resumeJourney(contactId: string, journeyType: JourneyType) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("contact_journeys")
    .update({
      is_paused: false,
      pause_reason: null,
      next_email_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType);

  if (error) return { error: error.message };
  revalidatePath("/newsletters");
  return { success: true };
}

export async function getJourneyDashboard() {
  const tc = await getAuthenticatedTenantClient();

  // Get all journey enrollments with contact info
  const { data: journeys } = await tc
    .from("contact_journeys")
    .select("*, contacts(id, name, email, type)")
    .order("updated_at", { ascending: false });

  // Aggregate by phase
  const buyerPhases: Record<string, number> = { lead: 0, active: 0, under_contract: 0, past_client: 0, dormant: 0 };
  const sellerPhases: Record<string, number> = { lead: 0, active: 0, under_contract: 0, past_client: 0, dormant: 0 };

  for (const j of journeys || []) {
    if (j.journey_type === "buyer") {
      buyerPhases[j.current_phase] = (buyerPhases[j.current_phase] || 0) + 1;
    } else {
      sellerPhases[j.current_phase] = (sellerPhases[j.current_phase] || 0) + 1;
    }
  }

  // Get newsletter stats
  const { count: totalSent } = await tc
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent");

  const { count: pendingApproval } = await tc
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("status", "draft")
    .eq("send_mode", "review");

  // Get recent events
  const { data: recentEvents } = await tc
    .from("newsletter_events")
    .select("*, contacts(name), newsletters(subject)")
    .order("created_at", { ascending: false })
    .limit(20);

  // Calculate engagement rates
  const { count: totalOpens } = await tc
    .from("newsletter_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "opened");

  const { count: totalClicks } = await tc
    .from("newsletter_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "clicked");

  return {
    journeys: journeys || [],
    buyerPhases,
    sellerPhases,
    totalContacts: (journeys || []).length,
    totalSent: totalSent || 0,
    pendingApproval: pendingApproval || 0,
    totalOpens: totalOpens || 0,
    totalClicks: totalClicks || 0,
    openRate: totalSent ? Math.round(((totalOpens || 0) / totalSent) * 100) : 0,
    clickRate: totalSent ? Math.round(((totalClicks || 0) / totalSent) * 100) : 0,
    recentEvents: recentEvents || [],
  };
}

export async function processJourneyQueue() {
  const tc = await getAuthenticatedTenantClient();

  // Find journeys that need an email sent.
  // Fetch CASL fields so we can enforce canSendToContact() in-loop.
  const { data: dueJourneys } = await tc
    .from("contact_journeys")
    .select("*, contacts(id, name, email, type, newsletter_intelligence, newsletter_unsubscribed, casl_consent_given, casl_consent_date, buyer_preferences)")
    .eq("is_paused", false)
    .not("next_email_at", "is", null)
    .lte("next_email_at", new Date().toISOString())
    .limit(50);

  if (!dueJourneys?.length) return { processed: 0 };

  let processed = 0;
  let skippedCasl = 0;

  for (const journey of dueJourneys) {
    const contact = journey.contacts as any;
    // Central CASL gate — see src/lib/compliance/can-send.ts
    const sendCheck = canSendToContact(contact);
    if (!sendCheck.allowed) {
      if (sendCheck.code === 'no_casl_consent' || sendCheck.code === 'unsubscribed') {
        skippedCasl++;
      }
      continue;
    }

    const schedule = JOURNEY_SCHEDULES[journey.journey_type as JourneyType][journey.current_phase as JourneyPhase];
    const emailIndex = journey.emails_sent_in_phase;

    if (emailIndex >= schedule.length) {
      // No more emails in this phase — wait for event to advance
      await tc
        .from("contact_journeys")
        .update({ next_email_at: null })
        .eq("id", journey.id);
      continue;
    }

    const emailConfig = schedule[emailIndex];

    try {
      // Import dynamically to avoid circular deps
      const { generateAndQueueNewsletter } = await import("@/actions/newsletters");

      await generateAndQueueNewsletter(
        contact.id,
        emailConfig.emailType,
        journey.current_phase,
        journey.id,
        "auto"
      );

      // Schedule next email
      const nextIndex = emailIndex + 1;
      const nextEmailAt = nextIndex < schedule.length
        ? new Date(Date.now() + schedule[nextIndex].delayHours * 3600000).toISOString()
        : null;

      await tc
        .from("contact_journeys")
        .update({
          emails_sent_in_phase: nextIndex,
          next_email_at: nextEmailAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", journey.id);

      processed++;
    } catch (e) {
      console.error(`Journey queue error for contact ${contact.id}:`, e);
      // Don't stop processing other journeys
    }
  }

  return { processed, skipped_casl: skippedCasl };
}

export async function autoEnrollNewContact(contactId: string, contactType: string) {
  // Only enroll types that have journey schedules
  if (["buyer", "seller", "customer", "agent"].includes(contactType)) {
    return enrollContactInJourney(contactId, contactType as JourneyType);
  }
  return { error: "No journey defined for this contact type" };
}
