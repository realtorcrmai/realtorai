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
      { emailType: "closing_checklist", delayHours: 0 },       // closing support at contract entry
      { emailType: "inspection_reminder", delayHours: 48 },    // 2 days — inspection deadline reminder
      { emailType: "neighbourhood_guide", delayHours: 48 },    // 2 days — area orientation for new home
    ],
    past_client: [
      { emailType: "home_anniversary", delayHours: 720 },      // 30 days after close
      { emailType: "referral_ask", delayHours: 720 },          // 30 days after close — refer a friend
      { emailType: "market_update", delayHours: 2160 },
      { emailType: "referral_ask", delayHours: 4320 },
      { emailType: "home_anniversary", delayHours: 8760 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },            // "We miss you" — market snapshot
      { emailType: "new_listing_alert", delayHours: 120 },     // 5 days — here's something you'll love
      { emailType: "referral_ask", delayHours: 240 },          // 10 days — if you're not ready, know anyone who is?
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
      { emailType: "referral_ask", delayHours: 720 },          // 30 days after close
      { emailType: "referral_ask", delayHours: 2160 },
      { emailType: "home_anniversary", delayHours: 8760 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },            // "We miss you" — market conditions
      { emailType: "market_update", delayHours: 120 },         // 5 days — what's happening in your area
      { emailType: "referral_ask", delayHours: 240 },          // 10 days — referral ask
    ],
  },
  customer: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "neighbourhood_guide", delayHours: 72 },
      { emailType: "market_update", delayHours: 336 },
    ],
    active: [
      { emailType: "market_update", delayHours: 0 },
      { emailType: "new_listing_alert", delayHours: 168 },
    ],
    under_contract: [],
    past_client: [
      { emailType: "home_anniversary", delayHours: 0 },
      { emailType: "market_update", delayHours: 168 },
      { emailType: "referral_ask", delayHours: 504 },          // 3 weeks
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
      { emailType: "market_update", delayHours: 168 },
      { emailType: "referral_ask", delayHours: 336 },
    ],
  },
  agent: {
    lead: [
      { emailType: "welcome", delayHours: 0 },
      { emailType: "market_update", delayHours: 168 },         // 1 week — market data
      { emailType: "referral_ask", delayHours: 336 },          // 2 weeks — referral partnership ask
    ],
    active: [
      { emailType: "market_update", delayHours: 0 },
      { emailType: "new_listing_alert", delayHours: 168 },
    ],
    under_contract: [],
    past_client: [
      { emailType: "market_update", delayHours: 0 },
      { emailType: "referral_ask", delayHours: 336 },
    ],
    dormant: [
      { emailType: "reengagement", delayHours: 0 },
      { emailType: "referral_ask", delayHours: 168 },
    ],
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

  // C-08: Explicit existence check — upsert with ignoreDuplicates returns null on conflict
  const { data: existing } = await tc
    .from("contact_journeys")
    .select("id, is_paused, current_phase")
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType)
    .maybeSingle();

  if (existing) {
    return { data: existing, alreadyEnrolled: true };
  }

  // Get first email schedule
  const schedule = JOURNEY_SCHEDULES[journeyType].lead;
  const nextEmailAt = schedule.length > 0
    ? new Date(Date.now() + schedule[0].delayHours * 3600000).toISOString()
    : null;

  // Not enrolled — insert fresh
  const { data, error } = await tc
    .from("contact_journeys")
    .insert({
      contact_id: contactId,
      journey_type: journeyType,
      current_phase: "lead",
      next_email_at: nextEmailAt,
      emails_sent_in_phase: 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };

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

  // Audit log — secondary, log but don't fail
  try {
    await tc.from("communications").insert({
      contact_id: contactId,
      direction: "internal",
      channel: "system",
      body: `Journey phase advanced: ${oldPhase} → ${newPhase} (${journeyType})`,
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    console.error('[journey:advance] Audit log failed (phase DID advance):', auditErr);
  }

  // Fire phase_changed trigger — secondary, log but don't fail
  try {
    const { fireTrigger } = await import("@/lib/trigger-engine");
    await fireTrigger("phase_changed", contactId, {
      contactType: journeyType,
      newPhase,
    });
  } catch (triggerErr) {
    console.error('[journey:advance] Trigger failed (phase DID advance):', triggerErr);
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

  // H-05: Use 1 hour after resume instead of forcing a 24h wait.
  // The scheduler will pick up immediately and use the phase schedule for subsequent emails.
  const { error } = await tc
    .from("contact_journeys")
    .update({
      is_paused: false,
      pause_reason: null,
      next_email_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour after resume
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
    .select("*, next_email_type_override, contacts(id, name, email, type, newsletter_intelligence, newsletter_unsubscribed, casl_consent_given, casl_consent_date, buyer_preferences)")
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

    // Check for next-best-action override set by the webhook on high-intent click
    const nbaOverride: string | null = (journey as any).next_email_type_override ?? null;
    const emailType = nbaOverride ?? emailConfig.emailType;

    try {
      // If an NBA override was used, clear it immediately before sending
      if (nbaOverride) {
        await tc
          .from("contact_journeys")
          .update({ next_email_type_override: null })
          .eq("id", journey.id);
      }

      // Import dynamically to avoid circular deps
      const { generateAndQueueNewsletter } = await import("@/actions/newsletters");

      // C-06: Separate try/catch for newsletter generation so a failure backs off
      // 6 hours rather than retrying immediately on every cron tick.
      try {
        await generateAndQueueNewsletter(
          contact.id,
          emailType,
          journey.current_phase,
          journey.id,
          "auto"
        );
      } catch (err) {
        console.error('[journey:queue] Newsletter generation failed for journey', journey.id, err);
        // Back off 6 hours so we don't hammer the same contact on every cron tick
        await tc.from('contact_journeys').update({
          next_email_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', journey.id);
        continue;
      }

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
      console.error(`[journey:queue] Unexpected error for journey ${journey.id} (contact ${contact.id}):`, e);
      // Don't stop processing other journeys
    }
  }

  return { processed, skipped_casl: skippedCasl };
}

// L-03: Type predicate to narrow string → JourneyType without a redundant cast
function isJourneyType(value: string): value is JourneyType {
  return (["buyer", "seller", "customer", "agent"] as const).includes(value as JourneyType);
}

export async function autoEnrollNewContact(contactId: string, contactType: string) {
  if (isJourneyType(contactType)) {
    return enrollContactInJourney(contactId, contactType);
  }
  return { error: "No journey defined for this contact type" };
}

export async function triggerNextEmail(journeyId: string) {
  const tc = await getAuthenticatedTenantClient();

  // Set next_email_at to now so processJourneyQueue picks it up immediately
  const { error } = await tc
    .from("contact_journeys")
    .update({ next_email_at: new Date().toISOString() })
    .eq("id", journeyId);

  if (error) return { error: error.message };

  // Process the queue now so the email goes out immediately
  await processJourneyQueue();

  revalidatePath("/newsletters/relationships");
  revalidatePath("/newsletters");
  return { success: true };
}

export async function getJourneysForRelationshipsPage(limit = 50, offset = 0) {
  const tc = await getAuthenticatedTenantClient();

  const { data: journeys } = await tc
    .from("contact_journeys")
    .select("id, contact_id, journey_type, current_phase, is_paused, pause_reason, next_email_at, emails_sent_in_phase, contacts(id, name, email, type)")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Contacts not enrolled in any journey
  const enrolledContactIds = new Set((journeys || []).map((j: any) => j.contact_id));

  const { data: allContacts } = await tc
    .from("contacts")
    .select("id, name, email, type")
    .in("type", ["buyer", "seller", "customer"])
    .order("name");

  const unenrolledContacts = (allContacts || []).filter((c: any) => !enrolledContactIds.has(c.id));

  return {
    journeys: journeys || [],
    unenrolledContacts,
    hasMore: (journeys || []).length === limit,
    offset,
    limit,
  };
}
