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
 * Check if the send governor allows sending to this contact.
 * More sophisticated than compliance gate — considers engagement trends,
 * per-phase caps, and realtor config.
 */
export async function checkSendGovernor(
  input: GovernorInput
): Promise<GovernorResult> {
  const supabase = createAdminClient();
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

  const frequencyCaps = (config?.frequency_caps as Record<string, { per_week?: number; per_month?: number; min_gap_hours: number }>) || {
    lead: { per_week: 2, min_gap_hours: 48 },
    active: { per_week: 3, min_gap_hours: 18 },
    under_contract: { per_week: 1, min_gap_hours: 72 },
    past_client: { per_month: 2, min_gap_hours: 168 },
    dormant: { per_month: 1, min_gap_hours: 336 },
  };

  const phaseCap = frequencyCaps[input.journeyPhase] || frequencyCaps.lead;

  // 2. Engagement-based throttling
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

  // 3. Auto-sunset check (0 opens in 90 days)
  const sunsetDays = (config?.auto_sunset_days as number) || 90;
  const sunsetCutoff = new Date(Date.now() - sunsetDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentOpens } = await supabase
    .from("newsletter_events")
    .select("id, newsletter_id")
    .eq("event_type", "opened")
    .in(
      "newsletter_id",
      (await supabase
        .from("newsletters")
        .select("id")
        .eq("contact_id", input.contactId)
        .eq("status", "sent")
        .gte("sent_at", sunsetCutoff)
      ).data?.map((n: { id: string }) => n.id) || []
    )
    .limit(1);

  // Check if we had enough emails sent to judge
  const { count: sentInPeriod } = await supabase
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", input.contactId)
    .eq("status", "sent")
    .gte("sent_at", sunsetCutoff);

  if (sentInPeriod && sentInPeriod >= 5 && (!recentOpens || recentOpens.length === 0)) {
    adjustments.push(`Auto-sunset: 0 opens in ${sunsetDays} days across ${sentInPeriod} emails`);

    // Pause the journey
    await supabase
      .from("contact_journeys")
      .update({ is_paused: true })
      .eq("contact_id", input.contactId);

    return {
      allowed: false,
      reason: `Auto-sunset: ${sentInPeriod} emails sent, 0 opens in ${sunsetDays} days`,
      suggestedDelay: null,
      adjustments,
    };
  }

  // 4. Skip weekends check
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

  // 5. Master switch check
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
    suggestedDelay: phaseCap.min_gap_hours,
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
