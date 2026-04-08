import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../lib/logger.js';

/**
 * Adaptive marketing learning engine.
 *
 * Ported faithfully from `realestate-crm/src/lib/learning-engine.ts`
 * (M3-C). Behaviour preserved exactly:
 *   - 30-day analysis window
 *   - content rankings (need ≥3 sends per type)
 *   - day/hour timing analysis (need ≥3 sends per bucket)
 *   - 15% improvement threshold for auto-adjusting send day
 *   - <10% effectiveness + ≥5 sent → suggest discontinuing content type
 *   - per-contact 4-week trend (accelerating / declining / stable)
 *   - merge into newsletter_intelligence (preserve untouched fields)
 *
 * Differences from CRM original:
 *   - SupabaseClient is injected (was: `createAdminClient()` per call) so
 *     tests can mock it and the cron can share a single connection
 *   - The pure-math helpers are exported separately so they can be unit
 *     tested without DB
 *   - structured pino logging on warnings instead of silent failures
 *   - tightened types (no `as any`)
 *
 * The N+1 batching fix flagged in M3 cron map §6.4 #3 is intentionally NOT
 * applied in this PR — that's a separate optimization PR after the port is
 * proven against staging. Behaviour preservation first.
 */

/* ─────────────────────────────── Types ─────────────────────────────── */

export type AutoAdjustment = {
  field: string;
  from: unknown;
  to: unknown;
  reason: string;
};

export type Suggestion = {
  field: string;
  suggested: string;
  reason: string;
  data: string;
};

export type LearningMetrics = {
  emailsAnalyzed: number;
  avgOpenRate: number;
  avgClickRate: number;
  topContentType: string;
  worstContentType: string;
  bestSendDay: string;
  bestSendHour: number;
};

export type LearningResult = {
  realtorId: string;
  autoAdjustments: AutoAdjustment[];
  suggestions: Suggestion[];
  metrics: LearningMetrics;
};

type NewsletterRow = {
  id: string;
  email_type: string;
  sent_at: string | null;
  contact_id: string | null;
};

type EventRow = {
  newsletter_id: string;
  event_type: string;
  created_at: string | null;
};

type ContentPerf = { sent: number; opened: number; clicked: number };
type TimingPerf = { sent: number; opened: number };

export type ContentRanking = {
  type: string;
  openRate: number;
  clickRate: number;
  effectiveness: number;
  sent: number;
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/* ─────────────────────────── Pure stats helpers ─────────────────────────── */

/** Bucket newsletters by `email_type` and count sends/opens/clicks. */
export function calculateContentPerf(
  newsletters: NewsletterRow[],
  events: EventRow[]
): Record<string, ContentPerf> {
  const perf: Record<string, ContentPerf> = {};
  for (const nl of newsletters) {
    const t = nl.email_type;
    if (!perf[t]) perf[t] = { sent: 0, opened: 0, clicked: 0 };
    perf[t].sent++;

    const nlEvents = events.filter((e) => e.newsletter_id === nl.id);
    if (nlEvents.some((e) => e.event_type === 'opened')) perf[t].opened++;
    if (nlEvents.some((e) => e.event_type === 'clicked')) perf[t].clicked++;
  }
  return perf;
}

/** Rank content types by effectiveness (need ≥3 sends to qualify). */
export function calculateContentRankings(perf: Record<string, ContentPerf>): ContentRanking[] {
  return Object.entries(perf)
    .filter(([, data]) => data.sent >= 3)
    .map(([type, data]) => ({
      type,
      openRate: data.opened / data.sent,
      clickRate: data.clicked / data.sent,
      effectiveness: (data.opened / data.sent) * 0.4 + (data.clicked / data.sent) * 0.6,
      sent: data.sent,
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness);
}

/** Bucket newsletters by send day-of-week and hour-of-day. */
export function calculateTimingPerf(
  newsletters: NewsletterRow[],
  events: EventRow[]
): { dayPerf: Record<string, TimingPerf>; hourPerf: Record<number, TimingPerf> } {
  const dayPerf: Record<string, TimingPerf> = {};
  const hourPerf: Record<number, TimingPerf> = {};

  for (const nl of newsletters) {
    if (!nl.sent_at) continue;
    const sentDate = new Date(nl.sent_at);
    const day = DAYS[sentDate.getDay()];
    const hour = sentDate.getHours();

    if (!dayPerf[day]) dayPerf[day] = { sent: 0, opened: 0 };
    dayPerf[day].sent++;
    if (!hourPerf[hour]) hourPerf[hour] = { sent: 0, opened: 0 };
    hourPerf[hour].sent++;

    const nlEvents = events.filter((e) => e.newsletter_id === nl.id);
    if (nlEvents.some((e) => e.event_type === 'opened')) {
      dayPerf[day].opened++;
      hourPerf[hour].opened++;
    }
  }

  return { dayPerf, hourPerf };
}

/** Pick the best day with at least 3 sends (default tuesday). */
export function pickBestDay(dayPerf: Record<string, TimingPerf>): string {
  return (
    Object.entries(dayPerf)
      .filter(([, d]) => d.sent >= 3)
      .sort((a, b) => b[1].opened / b[1].sent - a[1].opened / a[1].sent)[0]?.[0] || 'tuesday'
  );
}

/** Pick the best hour with at least 3 sends (default "9"). */
export function pickBestHour(hourPerf: Record<number, TimingPerf>): string {
  return (
    Object.entries(hourPerf)
      .filter(([, d]) => d.sent >= 3)
      .sort((a, b) => b[1].opened / b[1].sent - a[1].opened / a[1].sent)[0]?.[0] || '9'
  );
}

export type OverallMetrics = {
  totalSent: number;
  uniqueOpened: number;
  uniqueClicked: number;
  totalOpened: number;
  totalClicked: number;
  avgOpenRate: number;
  avgClickRate: number;
};

/** Compute overall sent / unique opened / clicked / rates. */
export function calculateOverallMetrics(
  newsletters: NewsletterRow[],
  events: EventRow[]
): OverallMetrics {
  const totalSent = newsletters.length;
  const totalOpened = events.filter((e) => e.event_type === 'opened').length;
  const totalClicked = events.filter((e) => e.event_type === 'clicked').length;
  const uniqueOpened = new Set(
    events.filter((e) => e.event_type === 'opened').map((e) => e.newsletter_id)
  ).size;
  const uniqueClicked = new Set(
    events.filter((e) => e.event_type === 'clicked').map((e) => e.newsletter_id)
  ).size;

  return {
    totalSent,
    uniqueOpened,
    uniqueClicked,
    totalOpened,
    totalClicked,
    avgOpenRate: totalSent > 0 ? uniqueOpened / totalSent : 0,
    avgClickRate: totalSent > 0 ? uniqueClicked / totalSent : 0,
  };
}

/** Engagement trend over the last 4 weeks. */
export function calculateTrend(
  newsletters: NewsletterRow[],
  events: EventRow[],
  now: number = Date.now()
): { trend: 'accelerating' | 'declining' | 'stable'; trendData: Array<{ week: string; opens: number; clicks: number }> } {
  const trendData: Array<{ week: string; opens: number; clicks: number }> = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(now - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now - w * 7 * 24 * 60 * 60 * 1000);
    const weekNls = newsletters.filter((n) => {
      if (!n.sent_at) return false;
      const d = new Date(n.sent_at);
      return d >= weekStart && d < weekEnd;
    });
    const weekNlIds = new Set(weekNls.map((n) => n.id));
    const weekEvents = events.filter((e) => weekNlIds.has(e.newsletter_id));
    trendData.push({
      week: weekStart.toISOString().slice(0, 10),
      opens: weekEvents.filter((e) => e.event_type === 'opened').length,
      clicks: weekEvents.filter((e) => e.event_type === 'clicked').length,
    });
  }

  const recentOpens = trendData[0]?.opens ?? 0;
  const olderOpens = trendData[2]?.opens ?? 0;

  const trend =
    recentOpens > olderOpens * 1.2
      ? 'accelerating'
      : recentOpens < olderOpens * 0.8
        ? 'declining'
        : 'stable';

  // CRM original returns trendData.reverse() — preserve that ordering
  return { trend, trendData: trendData.slice().reverse() };
}

/* ─────────────────────────── runLearningCycle ─────────────────────────── */

export async function runLearningCycle(
  db: SupabaseClient,
  realtorId: string
): Promise<LearningResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const autoAdjustments: AutoAdjustment[] = [];
  const suggestions: Suggestion[] = [];

  // Current config
  const { data: config, error: configErr } = await db
    .from('realtor_agent_config')
    .select('*')
    .eq('realtor_id', realtorId)
    .single();

  if (configErr) {
    logger.warn({ err: configErr, realtorId }, 'learning: config fetch failed (proceeding without)');
  }

  // Sent newsletters in last 30 days
  const { data: newsletters, error: nlErr } = await db
    .from('newsletters')
    .select('id, email_type, sent_at, contact_id')
    .eq('status', 'sent')
    .eq('realtor_id', realtorId)
    .gte('sent_at', thirtyDaysAgo);

  if (nlErr) {
    logger.error({ err: nlErr, realtorId }, 'learning: newsletter fetch failed');
  }

  if (!newsletters || newsletters.length === 0) {
    return {
      realtorId,
      autoAdjustments: [],
      suggestions: [],
      metrics: {
        emailsAnalyzed: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        topContentType: 'none',
        worstContentType: 'none',
        bestSendDay: 'tuesday',
        bestSendHour: 9,
      },
    };
  }

  const newsletterRows = newsletters as NewsletterRow[];
  const nlIds = newsletterRows.map((n) => n.id);

  const { data: events } = await db
    .from('newsletter_events')
    .select('newsletter_id, event_type, created_at, metadata')
    .in('newsletter_id', nlIds);

  const allEvents = (events ?? []) as EventRow[];

  // ── ANALYSIS 1: Content Type Performance ──
  const contentPerf = calculateContentPerf(newsletterRows, allEvents);
  const contentRankings = calculateContentRankings(contentPerf);

  if (contentRankings.length > 0) {
    autoAdjustments.push({
      field: 'content_rankings',
      from: config?.content_rankings,
      to: contentRankings,
      reason: `Updated from ${newsletterRows.length} emails across ${contentRankings.length} types`,
    });
  }

  // ── ANALYSIS 2: Timing Performance ──
  const { dayPerf, hourPerf } = calculateTimingPerf(newsletterRows, allEvents);
  const bestDay = pickBestDay(dayPerf);
  const bestHour = pickBestHour(hourPerf);

  if (config && bestDay !== config.default_send_day) {
    const oldDayKey = config.default_send_day as string;
    const oldDayRate = dayPerf[oldDayKey] ? dayPerf[oldDayKey].opened / dayPerf[oldDayKey].sent : 0;
    const newDayRate = dayPerf[bestDay] ? dayPerf[bestDay].opened / dayPerf[bestDay].sent : 0;

    if (newDayRate > oldDayRate * 1.15) {
      autoAdjustments.push({
        field: 'default_send_day',
        from: config.default_send_day,
        to: bestDay,
        reason: `${bestDay} open rate (${Math.round(newDayRate * 100)}%) beats ${oldDayKey} (${Math.round(oldDayRate * 100)}%) by >15%`,
      });
    }
  }

  // ── ANALYSIS 3: Overall Metrics ──
  const overall = calculateOverallMetrics(newsletterRows, allEvents);

  // ── APPLY AUTO-ADJUSTMENTS ──
  if (autoAdjustments.length > 0 && config) {
    const updates: Record<string, unknown> = {
      total_emails_analyzed: ((config.total_emails_analyzed as number) ?? 0) + overall.totalSent,
      last_learning_cycle: new Date().toISOString(),
      learning_confidence: overall.totalSent >= 200 ? 'high' : overall.totalSent >= 50 ? 'medium' : 'low',
    };

    for (const adj of autoAdjustments) {
      if (adj.field === 'content_rankings') updates.content_rankings = adj.to;
      if (adj.field === 'default_send_day') updates.default_send_day = adj.to;
      if (adj.field === 'default_send_hour') updates.default_send_hour = adj.to;
    }

    const { error: updateErr } = await db
      .from('realtor_agent_config')
      .update(updates)
      .eq('realtor_id', realtorId);

    if (updateErr) {
      logger.error({ err: updateErr, realtorId }, 'learning: config update failed');
    }

    for (const adj of autoAdjustments) {
      const { error: logErr } = await db.from('agent_learning_log').insert({
        realtor_id: realtorId,
        change_type: 'content_ranking',
        field_changed: adj.field,
        old_value: adj.from as object,
        new_value: adj.to as object,
        reason: adj.reason,
        auto_applied: true,
        approved: true,
      });
      if (logErr) {
        logger.warn({ err: logErr, field: adj.field }, 'learning: log insert failed');
      }
    }
  }

  // ── GENERATE SUGGESTIONS ──
  const topType = contentRankings[0]?.type || 'listing_alert';
  const worstType = contentRankings[contentRankings.length - 1]?.type || 'market_update';

  if (contentRankings.length >= 2) {
    const worst = contentRankings[contentRankings.length - 1];
    if (worst.effectiveness < 0.1 && worst.sent >= 5) {
      suggestions.push({
        field: 'content_type_removal',
        suggested: `Stop sending "${worst.type.replace(/_/g, ' ')}" emails`,
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
      emailsAnalyzed: overall.totalSent,
      avgOpenRate: Math.round(overall.avgOpenRate * 100) / 100,
      avgClickRate: Math.round(overall.avgClickRate * 100) / 100,
      topContentType: topType,
      worstContentType: worstType,
      bestSendDay: bestDay,
      bestSendHour: parseInt(bestHour, 10),
    },
  };
}

/* ─────────────────────── updateContactIntelligence ─────────────────────── */

export async function updateContactIntelligence(
  db: SupabaseClient,
  contactId: string
): Promise<void> {
  const { data: newsletters } = await db
    .from('newsletters')
    .select('id, email_type, sent_at')
    .eq('contact_id', contactId)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(20);

  if (!newsletters || newsletters.length === 0) return;

  const newsletterRows = newsletters as NewsletterRow[];
  const nlIds = newsletterRows.map((n) => n.id);

  const { data: events } = await db
    .from('newsletter_events')
    .select('newsletter_id, event_type, created_at')
    .in('newsletter_id', nlIds);

  const allEvents = (events ?? []) as EventRow[];

  // Per-contact content preferences
  const contentPrefs: Record<
    string,
    { sent: number; opened: number; clicked: number; converted: number }
  > = {};
  for (const nl of newsletterRows) {
    const t = nl.email_type;
    if (!contentPrefs[t]) contentPrefs[t] = { sent: 0, opened: 0, clicked: 0, converted: 0 };
    contentPrefs[t].sent++;
    const nlEvents = allEvents.filter((e) => e.newsletter_id === nl.id);
    if (nlEvents.some((e) => e.event_type === 'opened')) contentPrefs[t].opened++;
    if (nlEvents.some((e) => e.event_type === 'clicked')) contentPrefs[t].clicked++;
  }

  const { trend, trendData } = calculateTrend(newsletterRows, allEvents);

  // Get current intelligence (preserve untouched fields)
  const { data: contact } = await db
    .from('contacts')
    .select('newsletter_intelligence')
    .eq('id', contactId)
    .single();

  const currentIntel = (contact?.newsletter_intelligence as Record<string, unknown>) || {};

  const updatedIntel = {
    ...currentIntel,
    content_preferences: contentPrefs,
    engagement_trend: trend,
    trend_data: trendData,
    email_opens: allEvents.filter((e) => e.event_type === 'opened').length,
    email_clicks: allEvents.filter((e) => e.event_type === 'clicked').length,
    last_intelligence_update: new Date().toISOString(),
  };

  const { error: updateErr } = await db
    .from('contacts')
    .update({ newsletter_intelligence: updatedIntel })
    .eq('id', contactId);

  if (updateErr) {
    logger.warn({ err: updateErr, contactId }, 'learning: contact intel update failed');
  }
}
