/**
 * Send Governor — Sprint 4
 *
 * Advanced frequency management beyond the basic compliance gate.
 * Handles: engagement-based throttling, auto-sunset, per-phase caps,
 * dynamic timing based on realtor_agent_config.
 */

import { createAdminClient } from "@/lib/supabase/admin";

type GovernorInput = {
  contactId: string;
  contactType: string;
  journeyPhase: string;
  journeyType?: string; // H-08: caller passes the specific journey type to sunset
  engagementScore: number;
  engagementTrend: string;
  realtorId?: string;
};

type GovernorResult = {
  allowed: boolean;
  reason: string | null;
  suggestedDelay: number | null; // hours until next send
  adjustments: string[];
};

/**
 * Phase-aware frequency caps.
 * These are the defaults used when no realtor config is present, or as a
 * floor so realtor config cannot send faster than these limits.
 */
const PHASE_FREQUENCY_CAPS: Record<string, { maxPerDay: number; minHoursBetween: number }> = {
  lead: { maxPerDay: 1, minHoursBetween: 72 },          // 1/3 days — don't overwhelm new leads
  active: { maxPerDay: 1, minHoursBetween: 48 },        // every 2 days — actively engaged
  under_contract: { maxPerDay: 1, minHoursBetween: 24 }, // daily updates ok during contract
  past_client: { maxPerDay: 1, minHoursBetween: 168 },  // weekly max for past clients
  dormant: { maxPerDay: 1, minHoursBetween: 336 },       // every 2 weeks max for dormant
};

/**
 * Check if the send governor allows sending to this contact.
 * More sophisticated than compliance gate — considers engagement trends,
 * per-phase caps, and realtor config.
 *
 * Accepts an optional pre-created supabase client. Callers that invoke this
 * in a loop (e.g. campaign of 500 contacts) should create one client outside
 * the loop and pass it here to avoid 500 separate DB connections.
 */
export async function checkSendGovernor(
  input: GovernorInput,
  supabaseClient?: ReturnType<typeof createAdminClient>
): Promise<GovernorResult> {
  const supabase = supabaseClient ?? createAdminClient();
  const adjustments: string[] = [];

  // 1. Get realtor config (or use defaults)
  let config: Record<string, unknown> | null = null;
  if (input.realtorId) {
    const { data } = await supabase
      .from("realtor_agent_config")
      .select("*")
      .eq("realtor_id", input.realtorId)
      .single();
    config = data;
  }

  // Phase-aware caps — use PHASE_FREQUENCY_CAPS as the source of truth.
  // Realtor config's frequency_caps can override min_gap_hours but we still
  // enforce the phase defaults as a reasonable baseline.
  const realtorFrequencyCaps = (config?.frequency_caps as Record<string, { per_week?: number; per_month?: number; min_gap_hours: number }>) || {};

  // Resolve the active phase cap: prefer phase-aware defaults, allow realtor
  // config to extend min_gap_hours (but never shorten below phase minimum).
  const phase = input.journeyPhase || "lead";
  const phaseDefault = PHASE_FREQUENCY_CAPS[phase] ?? PHASE_FREQUENCY_CAPS.lead;
  const realtorPhaseCap = realtorFrequencyCaps[phase];

  const minHoursBetween = realtorPhaseCap?.min_gap_hours
    ? Math.max(phaseDefault.minHoursBetween, realtorPhaseCap.min_gap_hours)
    : phaseDefault.minHoursBetween;

  const phaseCap = {
    ...phaseDefault,
    min_gap_hours: minHoursBetween,
  };

  // 2. Enforce phase-aware minimum gap between sends
  const gapCutoff = new Date(Date.now() - minHoursBetween * 60 * 60 * 1000).toISOString();
  const { data: recentSend } = await supabase
    .from("newsletters")
    .select("id, sent_at")
    .eq("contact_id", input.contactId)
    .eq("status", "sent")
    .gte("sent_at", gapCutoff)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentSend) {
    const sentAt = new Date(recentSend.sent_at).getTime();
    const hoursAgo = (Date.now() - sentAt) / (1000 * 60 * 60);
    const hoursRemaining = Math.ceil(minHoursBetween - hoursAgo);
    adjustments.push(`Phase "${phase}" cap: min ${minHoursBetween}h between sends`);
    return {
      allowed: false,
      reason: `Too soon for phase "${phase}" — last email ${Math.floor(hoursAgo)}h ago, next in ${hoursRemaining}h`,
      suggestedDelay: hoursRemaining,
      adjustments,
    };
  }

  // 3. Engagement-based throttling
  if (input.engagementTrend === "declining" && input.engagementScore < 30) {
    // Reduce frequency for declining contacts
    adjustments.push("Engagement declining — reducing frequency to 1/2 weeks");
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("newsletters")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", input.contactId)
      .eq("status", "sent")
      .gte("sent_at", twoWeeksAgo);

    if (count && count >= 1) {
      return {
        allowed: false,
        reason: "Engagement declining — max 1 email per 2 weeks",
        suggestedDelay: 336, // 14 days
        adjustments,
      };
    }
  }

  // 4. Auto-sunset check (0 opens in 90 days)
  // Fix: single query to get all sent newsletter IDs in the window, then
  // check events in one go — avoids nested correlated subquery.
  const sunsetDays = (config?.auto_sunset_days as number) || 90;
  const sunsetCutoff = new Date(Date.now() - sunsetDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: sentNewsletters } = await supabase
    .from("newsletters")
    .select("id")
    .eq("contact_id", input.contactId)
    .eq("status", "sent")
    .gte("sent_at", sunsetCutoff);

  const sentInPeriod = sentNewsletters?.length ?? 0;
  const sentIds = sentNewsletters?.map((n: { id: string }) => n.id) ?? [];

  const { data: recentOpens } = sentIds.length > 0
    ? await supabase
        .from("newsletter_events")
        .select("id, newsletter_id")
        .eq("event_type", "opened")
        .in("newsletter_id", sentIds)
        .limit(1)
    : { data: [] };

  if (sentInPeriod >= 5 && (!recentOpens || recentOpens.length === 0)) {
    adjustments.push(`Auto-sunset: 0 opens in ${sunsetDays} days across ${sentInPeriod} emails`);

    // H-08: Only pause the specific journey type that triggered sunset (not ALL journeys).
    // H-09: Single batch UPDATE — no per-row loops.
    const pauseQuery = supabase
      .from("contact_journeys")
      .update({ is_paused: true })
      .eq("contact_id", input.contactId);

    const finalPauseQuery = input.journeyType
      ? pauseQuery.eq("journey_type", input.journeyType)
      : pauseQuery;

    await finalPauseQuery;

    return {
      allowed: false,
      reason: `Auto-sunset: ${sentInPeriod} emails sent, 0 opens in ${sunsetDays} days`,
      suggestedDelay: null,
      adjustments,
    };
  }

  // 5. Skip weekends check
  const skipWeekends = (config?.skip_weekends as boolean) || false;
  if (skipWeekends) {
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      return {
        allowed: false,
        reason: "Weekend sending disabled",
        suggestedDelay: day === 6 ? 48 : 24, // hours until Monday
        adjustments: ["Weekend skip enabled"],
      };
    }
  }

  // 6. Master switch check
  const sendingEnabled = config?.sending_enabled !== false;
  if (!sendingEnabled) {
    return {
      allowed: false,
      reason: "Sending disabled by realtor (master switch off)",
      suggestedDelay: null,
      adjustments: ["Master switch is OFF"],
    };
  }

  return {
    allowed: true,
    reason: null,
    suggestedDelay: phaseCap.minHoursBetween,
    adjustments,
  };
}

/**
 * Get the optimal send time for a contact based on their engagement data
 * and the realtor's default config.
 */
export function getOptimalSendTime(
  contactIntelligence: Record<string, unknown> | null,
  realtorConfig: Record<string, unknown> | null
): { day: string; hour: number } {
  // Per-contact timing (highest priority)
  const timing = (contactIntelligence as Record<string, unknown>)?.timing_patterns as
    | { best_day?: string; best_hour?: number; data_points?: number }
    | undefined;

  if (timing?.best_day && timing?.best_hour !== undefined && (timing.data_points || 0) >= 5) {
    return { day: timing.best_day, hour: timing.best_hour };
  }

  // Realtor default (fallback)
  const defaultDay = (realtorConfig?.default_send_day as string) || "tuesday";
  const defaultHour = (realtorConfig?.default_send_hour as number) || 9;

  return { day: defaultDay, hour: defaultHour };
}
