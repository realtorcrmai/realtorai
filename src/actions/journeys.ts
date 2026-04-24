"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { canSendToContact } from "@/lib/compliance/can-send";
import { checkSendGovernor } from "@/lib/send-governor";
import { revalidatePath } from "next/cache";

import {
  JOURNEY_SCHEDULES,
  type JourneyType,
  type JourneyPhase,
} from "@/lib/constants/journey-schedules";

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

// Phase progression order for BUG-03 exhausted-phase handling
const PHASE_ORDER: JourneyPhase[] = ["lead", "active", "under_contract", "past_client", "dormant"];

export async function resumeJourney(contactId: string, journeyType: JourneyType) {
  const tc = await getAuthenticatedTenantClient();

  // BUG-03 FIX: fetch current journey state so we can detect exhausted phase before setting next_email_at.
  const { data: currentJourney, error: fetchError } = await tc
    .from("contact_journeys")
    .select("current_phase, emails_sent_in_phase")
    .eq("contact_id", contactId)
    .eq("journey_type", journeyType)
    .single();

  if (fetchError) return { error: fetchError.message };

  const currentPhase = (currentJourney?.current_phase ?? "lead") as JourneyPhase;
  const emailsSent = currentJourney?.emails_sent_in_phase ?? 0;
  const schedule = JOURNEY_SCHEDULES[journeyType][currentPhase];
  const phaseExhausted = emailsSent >= schedule.length;

  if (phaseExhausted) {
    // All emails in the current phase have been sent and no event advanced the phase.
    // Advance to the next phase automatically instead of freezing the journey.
    const currentIdx = PHASE_ORDER.indexOf(currentPhase);
    const nextPhase: JourneyPhase | undefined = PHASE_ORDER[currentIdx + 1];

    if (!nextPhase) {
      // Already at past_client with no next meaningful phase — pause the journey.
      const { error } = await tc
        .from("contact_journeys")
        .update({
          is_paused: true,
          pause_reason: "phase_exhausted_no_next_phase",
          updated_at: new Date().toISOString(),
        })
        .eq("contact_id", contactId)
        .eq("journey_type", journeyType);
      if (error) return { error: error.message };
      revalidatePath("/newsletters");
      return { success: true };
    }

    // Advance to next phase
    const nextSchedule = JOURNEY_SCHEDULES[journeyType][nextPhase];
    const nextEmailAt = nextSchedule.length > 0
      ? new Date(Date.now() + nextSchedule[0].delayHours * 3600000).toISOString()
      : null;

    const { error } = await tc
      .from("contact_journeys")
      .update({
        is_paused: false,
        pause_reason: null,
        current_phase: nextPhase,
        phase_entered_at: new Date().toISOString(),
        emails_sent_in_phase: 0,
        next_email_at: nextEmailAt,
        updated_at: new Date().toISOString(),
      })
      .eq("contact_id", contactId)
      .eq("journey_type", journeyType);

    if (error) return { error: error.message };
    revalidatePath("/newsletters");
    return { success: true };
  }

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

export async function processJourneyQueue(realtorId?: string) {
  // BUG-01 FIX: cron has no user session — use admin client so journeys actually process.
  // This function processes all realtors' journeys system-wide; admin client is correct here.
  // When realtorId is provided (e.g. called from triggerNextEmail in user context),
  // scope the query to only that realtor's journeys to avoid cross-tenant processing.
  const tc = createAdminClient();

  // Find journeys that need an email sent.
  // Fetch CASL fields so we can enforce canSendToContact() in-loop.
  // 5-D FIX: also select send_mode so we respect the realtor's review preference.
  // Only process consumer journeys (buyer/seller/customer).
  // Agent contacts (other realtors/buyer agents stored as CRM contacts) are B2B — they
  // require explicit opt-in and should not run through the consumer nurture pipeline.
  let journeyQuery = tc
    .from("contact_journeys")
    .select("*, send_mode, next_email_type_override, contacts(id, name, email, type, newsletter_intelligence, newsletter_unsubscribed, casl_consent_given, casl_consent_date, casl_consent_expires_at, buyer_preferences)")
    .in("journey_type", ["buyer", "seller", "customer"])
    .eq("is_paused", false)
    .not("next_email_at", "is", null)
    .lte("next_email_at", new Date().toISOString())
    .limit(50);

  if (realtorId) {
    journeyQuery = journeyQuery.eq("realtor_id", realtorId);
  }

  const { data: dueJourneys, error: journeyQueryError } = await journeyQuery;

  if (journeyQueryError) {
    console.error("[processJourneyQueue] query error:", journeyQueryError);
    return { processed: 0, queryError: journeyQueryError.message };
  }

  const foundCount = dueJourneys?.length ?? 0;
  console.log(`[processJourneyQueue] found ${foundCount} due journeys`);
  if (!foundCount) return { processed: 0, due_found: 0 };

  let processed = 0;
  let skippedCasl = 0;
  const debugSkipped: Array<{ contactId: string; email: string; reason: string; code: string; casl_consent_given: boolean | null }> = [];

  for (const journey of dueJourneys) {
    const contact = journey.contacts as any;
    // Central CASL gate — see src/lib/compliance/can-send.ts
    const sendCheck = canSendToContact(contact);
    if (!sendCheck.allowed) {
      console.log(`[processJourneyQueue] CASL block: contact=${contact?.id} email=${contact?.email} code=${sendCheck.code} casl=${contact?.casl_consent_given}`);
      debugSkipped.push({ contactId: contact?.id, email: contact?.email, reason: sendCheck.reason, code: sendCheck.code, casl_consent_given: contact?.casl_consent_given });
      if (sendCheck.code === 'no_casl_consent' || sendCheck.code === 'unsubscribed') {
        skippedCasl++;
      }
      continue;
    }

    // G-J02: Send governor — frequency caps, engagement throttling, auto-sunset
    const governorResult = await checkSendGovernor({
      contactId: contact.id,
      contactType: contact.type,
      journeyPhase: journey.current_phase,
      journeyType: journey.journey_type,
      engagementScore: (contact as any).newsletter_intelligence?.engagement_score ?? 0,
      engagementTrend: (contact as any).newsletter_intelligence?.engagement_trend ?? "stable",
    });

    if (!governorResult.allowed) {
      // Auto-sunset: journey already paused by governor — nothing more needed
      if (governorResult.reason?.startsWith("Auto-sunset")) {
        console.log(`[journey:governor] Auto-sunset for contact ${contact.id}: ${governorResult.reason}`);
        continue;
      }
      // Frequency cap: defer next_email_at by suggested delay
      if (governorResult.suggestedDelay) {
        await tc
          .from("contact_journeys")
          .update({
            next_email_at: new Date(Date.now() + governorResult.suggestedDelay * 3600000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", journey.id);
      }
      continue;
    }

    const schedule = JOURNEY_SCHEDULES[journey.journey_type as JourneyType][journey.current_phase as JourneyPhase];
    const emailIndex = journey.emails_sent_in_phase;

    if (emailIndex >= schedule.length) {
      const engagementScore = (contact as any).newsletter_intelligence?.engagement_score ?? 0;

      // past_client loops annually — reset the phase and schedule one year out
      if (journey.current_phase === "past_client") {
        await tc
          .from("contact_journeys")
          .update({
            emails_sent_in_phase: 0,
            next_email_at: new Date(Date.now() + 365 * 24 * 3600000).toISOString(),
          })
          .eq("id", journey.id);
        continue;
      }

      // Minimum engagement score (0-100) required to graduate a lead to the active phase.
      // Contacts above this threshold showed enough interest to warrant active nurturing;
      // those below are moved to dormant for lighter-touch re-engagement.
      const PHASE_ADVANCE_SCORE_THRESHOLD = 40;

      // Other phases: auto-advance based on engagement rather than freezing
      const nextPhase = (engagementScore > PHASE_ADVANCE_SCORE_THRESHOLD && journey.current_phase === "lead") ? "active" : "dormant";

      await tc
        .from("contact_journeys")
        .update({
          current_phase: nextPhase,
          phase_entered_at: new Date().toISOString(),
          emails_sent_in_phase: 0,
          next_email_at: new Date().toISOString(),
          pause_reason: null,
          is_paused: false,
        })
        .eq("id", journey.id);

      console.log(`[journey] Phase exhausted: ${journey.current_phase} → ${nextPhase} (contact: ${journey.contact_id}, score: ${engagementScore})`);
      continue;
    }

    const emailConfig = schedule[emailIndex];

    // Check for next-best-action override set by the webhook on high-intent click
    const nbaOverride: string | null = (journey as any).next_email_type_override ?? null;
    const emailType = nbaOverride ?? emailConfig.emailType;

    try {
      // Import dynamically to avoid circular deps
      const { generateAndQueueNewsletter } = await import("@/actions/newsletters");

      // C-06: Separate try/catch for newsletter generation so a failure backs off
      // 6 hours rather than retrying immediately on every cron tick.
      // H7: Clear NBA override AFTER generation succeeds — not before — so the
      // override survives if generation fails and remains for the next queue run.
      try {
        console.log(`[journey:queue] Generating ${emailType} for contact ${contact.id} (journey ${journey.id})`);
        const genResult = await generateAndQueueNewsletter(
          contact.id,
          emailType,
          journey.current_phase,
          journey.id,
          journey.send_mode ?? "auto",
          journey.realtor_id ?? undefined  // pass realtorId so cron can bypass session auth
        );
        console.log(`[journey:queue] Result for ${contact.id}: ${JSON.stringify(genResult ? { error: genResult.error, hasData: !!genResult.data } : 'null/undefined')}`);

        // Check if generation returned an error (it doesn't throw, it returns { error })
        if (!genResult || genResult.error || !genResult.data) {
          const reason = genResult?.error || 'No newsletter created (returned empty)';
          console.warn(`[journey:queue] Newsletter generation returned error for ${contact.id}: ${reason}`);
          debugSkipped.push({ contactId: contact.id, email: contact.email, reason: `gen_error: ${reason}`, code: 'generation_failed' as any, casl_consent_given: contact.casl_consent_given });
          // Back off 3 hours for soft errors (frequency cap, dedup) vs 6 for hard failures
          await tc.from('contact_journeys').update({
            next_email_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', journey.id);
          continue;
        }

        // H7: Only clear the override once generation has confirmed success
        if (nbaOverride) {
          await tc
            .from("contact_journeys")
            .update({ next_email_type_override: null })
            .eq("id", journey.id);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[journey:queue] Newsletter generation failed for journey', journey.id, errMsg);
        debugSkipped.push({ contactId: contact?.id, email: contact?.email, reason: `generation_failed: ${errMsg}`, code: 'generation_failed' as any, casl_consent_given: contact?.casl_consent_given });
        // Back off 6 hours so we don't hammer the same contact on every cron tick
        // NBA override is deliberately left intact so the next run retries with it
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

  return { processed, skipped_casl: skippedCasl, due_found: foundCount, debug_skipped: debugSkipped };
}

// L-03: Type predicate to narrow string → JourneyType without a redundant cast
function isJourneyType(value: string): value is JourneyType {
  return (["buyer", "seller", "customer", "agent"] as const).includes(value as JourneyType);
}

export async function autoEnrollNewContact(contactId: string, contactType: string) {
  // Agent contacts (other realtors/buyer agents) are B2B and must never be auto-enrolled.
  // They have their own journey schedule but require explicit opt-in via enrollContactInJourney().
  if (contactType === "agent") {
    return { skipped: true, reason: "agent contacts require explicit enrollment" };
  }
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

  // Process the queue now so the email goes out immediately.
  // Pass realtorId to scope processing to only this realtor's journeys.
  await processJourneyQueue(tc.realtorId);

  revalidatePath("/newsletters/relationships");
  revalidatePath("/newsletters");
  return { success: true };
}

export async function getJourneysForRelationshipsPage(limit = 50, offset = 0) {
  const tc = await getAuthenticatedTenantClient();

  // Consumer journeys only — buyer/seller/customer are AI-nurtured automatically.
  // Agent journeys (other realtors) are excluded here; they run on a separate opt-in path.
  const { data: journeys } = await tc
    .from("contact_journeys")
    .select("id, contact_id, journey_type, current_phase, is_paused, pause_reason, next_email_at, emails_sent_in_phase, contacts(id, name, email, type)")
    .in("journey_type", ["buyer", "seller", "customer"])
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Contacts not enrolled in any journey (buyer/seller/customer only)
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
