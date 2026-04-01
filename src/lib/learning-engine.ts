/**
 * Learning Engine — Sprint 5 (Adaptive Marketing)
 *
 * Weekly analysis cycle that reads email outcomes and adjusts:
 * - Content type effectiveness rankings
 * - Per-contact timing patterns
 * - Frequency sweet spots
 * - Escalation thresholds
 * - Email sequence order
 *
 * Runs as a cron job weekly. Results update realtor_agent_config
 * and per-contact newsletter_intelligence.
 */

import { createAdminClient } from "@/lib/supabase/admin";

type LearningResult = {
  realtorId: string;
  autoAdjustments: Array<{ field: string; from: unknown; to: unknown; reason: string }>;
  suggestions: Array<{ field: string; suggested: unknown; reason: string; data: string }>;
  metrics: {
    emailsAnalyzed: number;
    avgOpenRate: number;
    avgClickRate: number;
    topContentType: string;
    worstContentType: string;
    bestSendDay: string;
    bestSendHour: number;
  };
};

/**
 * Run the weekly learning cycle for a realtor.
 * Analyzes last 30 days of email outcomes.
 */
export async function runLearningCycle(realtorId: string): Promise<LearningResult> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const autoAdjustments: LearningResult["autoAdjustments"] = [];
  const suggestions: LearningResult["suggestions"] = [];

  // Get current config
  const { data: config } = await supabase
    .from("realtor_agent_config")
    .select("*")
    .eq("realtor_id", realtorId)
    .single();

  // Get all sent newsletters in last 30 days
  const { data: newsletters } = await supabase
    .from("newsletters")
    .select("id, email_type, sent_at, contact_id")
    .eq("status", "sent")
    .gte("sent_at", thirtyDaysAgo);

  if (!newsletters || newsletters.length === 0) {
    return {
      realtorId,
      autoAdjustments: [],
      suggestions: [],
      metrics: {
        emailsAnalyzed: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        topContentType: "none",
        worstContentType: "none",
        bestSendDay: "tuesday",
        bestSendHour: 9,
      },
    };
  }

  const nlIds = newsletters.map((n) => n.id);

  // Get all events for these newsletters
  const { data: events } = await supabase
    .from("newsletter_events")
    .select("newsletter_id, event_type, created_at, metadata")
    .in("newsletter_id", nlIds);

  const allEvents = events || [];

  // ── ANALYSIS 1: Content Type Performance ──
  const contentPerf: Record<string, { sent: number; opened: number; clicked: number }> = {};
  for (const nl of newsletters) {
    const type = nl.email_type;
    if (!contentPerf[type]) contentPerf[type] = { sent: 0, opened: 0, clicked: 0 };
    contentPerf[type].sent++;

    const nlEvents = allEvents.filter((e) => e.newsletter_id === nl.id);
    if (nlEvents.some((e) => e.event_type === "opened")) contentPerf[type].opened++;
    if (nlEvents.some((e) => e.event_type === "clicked")) contentPerf[type].clicked++;
  }

  const contentRankings = Object.entries(contentPerf)
    .filter(([, data]) => data.sent >= 3) // need enough data
    .map(([type, data]) => ({
      type,
      openRate: data.opened / data.sent,
      clickRate: data.clicked / data.sent,
      effectiveness: (data.opened / data.sent) * 0.4 + (data.clicked / data.sent) * 0.6,
      sent: data.sent,
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness);

  // Auto-adjust: update content rankings
  if (contentRankings.length > 0) {
    autoAdjustments.push({
      field: "content_rankings",
      from: config?.content_rankings,
      to: contentRankings,
      reason: `Updated from ${newsletters.length} emails across ${contentRankings.length} types`,
    });
  }

  // ── ANALYSIS 2: Timing Performance ──
  const dayPerf: Record<string, { sent: number; opened: number }> = {};
  const hourPerf: Record<number, { sent: number; opened: number }> = {};

  for (const nl of newsletters) {
    if (!nl.sent_at) continue;
    const sentDate = new Date(nl.sent_at);
    const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][sentDate.getDay()];
    const hour = sentDate.getHours();

    if (!dayPerf[day]) dayPerf[day] = { sent: 0, opened: 0 };
    dayPerf[day].sent++;
    if (!hourPerf[hour]) hourPerf[hour] = { sent: 0, opened: 0 };
    hourPerf[hour].sent++;

    const nlEvents = allEvents.filter((e) => e.newsletter_id === nl.id);
    if (nlEvents.some((e) => e.event_type === "opened")) {
      dayPerf[day].opened++;
      hourPerf[hour].opened++;
    }
  }

  const bestDay = Object.entries(dayPerf)
    .filter(([, d]) => d.sent >= 3)
    .sort((a, b) => (b[1].opened / b[1].sent) - (a[1].opened / a[1].sent))[0]?.[0] || "tuesday";

  const bestHour = Object.entries(hourPerf)
    .filter(([, d]) => d.sent >= 3)
    .sort((a, b) => (b[1].opened / b[1].sent) - (a[1].opened / a[1].sent))[0]?.[0] || "9";

  // Auto-adjust timing if significantly different
  if (config && bestDay !== config.default_send_day) {
    const oldDayRate = dayPerf[config.default_send_day as string]
      ? dayPerf[config.default_send_day as string].opened / dayPerf[config.default_send_day as string].sent
      : 0;
    const newDayRate = dayPerf[bestDay]
      ? dayPerf[bestDay].opened / dayPerf[bestDay].sent
      : 0;

    if (newDayRate > oldDayRate * 1.15) {
      autoAdjustments.push({
        field: "default_send_day",
        from: config.default_send_day,
        to: bestDay,
        reason: `${bestDay} open rate (${Math.round(newDayRate * 100)}%) beats ${config.default_send_day} (${Math.round(oldDayRate * 100)}%) by >15%`,
      });
    }
  }

  // ── ANALYSIS 3: Overall Metrics ──
  const totalSent = newsletters.length;
  const totalOpened = allEvents.filter((e) => e.event_type === "opened").length;
  const totalClicked = allEvents.filter((e) => e.event_type === "clicked").length;
  const uniqueOpened = new Set(allEvents.filter((e) => e.event_type === "opened").map((e) => e.newsletter_id)).size;
  const uniqueClicked = new Set(allEvents.filter((e) => e.event_type === "clicked").map((e) => e.newsletter_id)).size;

  const avgOpenRate = totalSent > 0 ? uniqueOpened / totalSent : 0;
  const avgClickRate = totalSent > 0 ? uniqueClicked / totalSent : 0;

  // ── APPLY AUTO-ADJUSTMENTS ──
  if (autoAdjustments.length > 0 && config) {
    const updates: Record<string, unknown> = {
      total_emails_analyzed: (config.total_emails_analyzed as number || 0) + totalSent,
      last_learning_cycle: new Date().toISOString(),
      learning_confidence: totalSent >= 200 ? "high" : totalSent >= 50 ? "medium" : "low",
    };

    for (const adj of autoAdjustments) {
      if (adj.field === "content_rankings") updates.content_rankings = adj.to;
      if (adj.field === "default_send_day") updates.default_send_day = adj.to;
      if (adj.field === "default_send_hour") updates.default_send_hour = adj.to;
    }

    await supabase
      .from("realtor_agent_config")
      .update(updates)
      .eq("realtor_id", realtorId);

    // Log each adjustment
    for (const adj of autoAdjustments) {
      await supabase.from("agent_learning_log").insert({
        realtor_id: realtorId,
        change_type: "content_ranking",
        field_changed: adj.field,
        old_value: adj.from as object,
        new_value: adj.to as object,
        reason: adj.reason,
        auto_applied: true,
        approved: true,
      });
    }
  }

  // ── GENERATE SUGGESTIONS (need realtor approval) ──
  const topType = contentRankings[0]?.type || "listing_alert";
  const worstType = contentRankings[contentRankings.length - 1]?.type || "market_update";

  if (contentRankings.length >= 2) {
    const worst = contentRankings[contentRankings.length - 1];
    if (worst.effectiveness < 0.1 && worst.sent >= 5) {
      suggestions.push({
        field: "content_type_removal",
        suggested: `Stop sending "${worst.type.replace(/_/g, " ")}" emails`,
        reason: `${Math.round(worst.openRate * 100)}% open rate across ${worst.sent} emails — lowest performer`,
        data: JSON.stringify(worst),
      });
    }
  }

  return {
    realtorId,
    autoAdjustments,
    suggestions,
    metrics: {
      emailsAnalyzed: totalSent,
      avgOpenRate: Math.round(avgOpenRate * 100) / 100,
      avgClickRate: Math.round(avgClickRate * 100) / 100,
      topContentType: topType,
      worstContentType: worstType,
      bestSendDay: bestDay,
      bestSendHour: parseInt(bestHour),
    },
  };
}

/**
 * Update per-contact intelligence from their individual email outcomes.
 */
export async function updateContactIntelligence(contactId: string): Promise<void> {
  const supabase = createAdminClient();

  // Get contact's recent newsletters + events
  const { data: newsletters } = await supabase
    .from("newsletters")
    .select("id, email_type, sent_at")
    .eq("contact_id", contactId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(20);

  if (!newsletters || newsletters.length === 0) return;

  const nlIds = newsletters.map((n) => n.id);
  const { data: events } = await supabase
    .from("newsletter_events")
    .select("newsletter_id, event_type, created_at")
    .in("newsletter_id", nlIds);

  const allEvents = events || [];

  // Calculate content preferences
  const contentPrefs: Record<string, { sent: number; opened: number; clicked: number; converted: number }> = {};
  for (const nl of newsletters) {
    const t = nl.email_type;
    if (!contentPrefs[t]) contentPrefs[t] = { sent: 0, opened: 0, clicked: 0, converted: 0 };
    contentPrefs[t].sent++;

    const nlEvents = allEvents.filter((e) => e.newsletter_id === nl.id);
    if (nlEvents.some((e) => e.event_type === "opened")) contentPrefs[t].opened++;
    if (nlEvents.some((e) => e.event_type === "clicked")) contentPrefs[t].clicked++;
  }

  // Calculate engagement trend (last 4 weeks)
  const trendData: Array<{ week: string; opens: number; clicks: number }> = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(Date.now() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(Date.now() - w * 7 * 24 * 60 * 60 * 1000);
    const weekNls = newsletters.filter((n) => {
      const d = new Date(n.sent_at!);
      return d >= weekStart && d < weekEnd;
    });
    const weekNlIds = weekNls.map((n) => n.id);
    const weekEvents = allEvents.filter((e) => weekNlIds.includes(e.newsletter_id));

    trendData.push({
      week: weekStart.toISOString().slice(0, 10),
      opens: weekEvents.filter((e) => e.event_type === "opened").length,
      clicks: weekEvents.filter((e) => e.event_type === "clicked").length,
    });
  }

  // Determine trend
  const recentOpens = trendData[0]?.opens || 0;
  const olderOpens = trendData[2]?.opens || 0;
  const trend =
    recentOpens > olderOpens * 1.2
      ? "accelerating"
      : recentOpens < olderOpens * 0.8
      ? "declining"
      : "stable";

  // Get current intelligence
  const { data: contact } = await supabase
    .from("contacts")
    .select("newsletter_intelligence")
    .eq("id", contactId)
    .single();

  const currentIntel = (contact?.newsletter_intelligence as Record<string, unknown>) || {};

  // Merge updates (preserve fields we don't touch)
  const updatedIntel = {
    ...currentIntel,
    content_preferences: contentPrefs,
    engagement_trend: trend,
    trend_data: trendData.reverse(),
    email_opens: allEvents.filter((e) => e.event_type === "opened").length,
    email_clicks: allEvents.filter((e) => e.event_type === "clicked").length,
    last_intelligence_update: new Date().toISOString(),
  };

  await supabase
    .from("contacts")
    .update({ newsletter_intelligence: updatedIntel })
    .eq("id", contactId);
}
