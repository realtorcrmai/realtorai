/**
 * Cron: weekly-digest
 *
 * Schedule: Monday 8 AM Vancouver (registered in `crons/index.ts`).
 * Sends a weekly performance summary to each realtor covering the last 7 days:
 *   - Emails sent, open rate, click rate, bounces
 *   - Top engaged contacts
 *   - Agent decisions summary
 *   - Total cost (from agent_runs)
 *
 * Always active — no feature flag. Sends to the realtor's email (from `users`
 * table), NOT to contacts, so CASL compliance checks are not needed.
 */

import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { captureException } from '../lib/sentry.js';
import { assembleEmail, type EmailData } from '../lib/email-blocks.js';
import { sendEmail } from '../lib/resend.js';

type DigestStats = {
  emailsSent: number;
  opens: number;
  clicks: number;
  bounces: number;
  openRate: string;
  clickRate: string;
  topContacts: Array<{ name: string; engagement: number }>;
  agentDecisions: { total: number; approved: number; rejected: number };
  totalCost: number;
};

async function gatherRealtorStats(realtorId: string, since: string): Promise<DigestStats> {
  // Emails sent in the last 7 days
  const { data: newsletters } = await supabase
    .from('newsletters')
    .select('id, contact_id, status')
    .eq('realtor_id', realtorId)
    .eq('status', 'sent')
    .gte('sent_at', since);

  const emailsSent = newsletters?.length ?? 0;
  const newsletterIds = (newsletters ?? []).map((n) => n.id);

  // Events for those newsletters
  let opens = 0;
  let clicks = 0;
  let bounces = 0;

  if (newsletterIds.length > 0) {
    const { data: events } = await supabase
      .from('newsletter_events')
      .select('event_type, contact_id')
      .in('newsletter_id', newsletterIds);

    for (const evt of events ?? []) {
      if (evt.event_type === 'opened') opens++;
      else if (evt.event_type === 'clicked') clicks++;
      else if (evt.event_type === 'bounced') bounces++;
    }
  }

  const openRate = emailsSent > 0 ? ((opens / emailsSent) * 100).toFixed(1) : '0.0';
  const clickRate = emailsSent > 0 ? ((clicks / emailsSent) * 100).toFixed(1) : '0.0';

  // Top engaged contacts (by newsletter_intelligence.engagement_score)
  const { data: topContactRows } = await supabase
    .from('contacts')
    .select('name, newsletter_intelligence')
    .eq('realtor_id', realtorId)
    .not('newsletter_intelligence', 'is', null)
    .order('newsletter_intelligence->engagement_score', { ascending: false })
    .limit(5);

  const topContacts = (topContactRows ?? []).map((c) => ({
    name: (c.name as string) ?? 'Unknown',
    engagement: ((c.newsletter_intelligence as Record<string, number>)?.engagement_score ?? 0),
  }));

  // Agent decisions (from agent_drafts)
  const { data: drafts } = await supabase
    .from('agent_drafts')
    .select('status')
    .eq('realtor_id', realtorId)
    .gte('created_at', since);

  const agentDecisions = {
    total: drafts?.length ?? 0,
    approved: (drafts ?? []).filter((d) => d.status === 'approved' || d.status === 'sent').length,
    rejected: (drafts ?? []).filter((d) => d.status === 'rejected').length,
  };

  // Total cost from agent_runs
  const { data: runs } = await supabase
    .from('agent_runs')
    .select('cost_usd')
    .eq('realtor_id', realtorId)
    .gte('created_at', since);

  const totalCost = (runs ?? []).reduce(
    (sum, r) => sum + (typeof r.cost_usd === 'number' ? r.cost_usd : 0),
    0
  );

  return { emailsSent, opens, clicks, bounces, openRate, clickRate, topContacts, agentDecisions, totalCost };
}

function buildDigestEmailData(
  realtorName: string,
  stats: DigestStats
): EmailData {
  const topContactsList = stats.topContacts.length > 0
    ? stats.topContacts.map((c) => `${c.name} (score: ${c.engagement})`).join(', ')
    : 'No engagement data yet';

  return {
    contact: {
      name: realtorName,
      firstName: realtorName.split(' ')[0],
      type: 'realtor',
    },
    agent: {
      name: 'Realtors360',
      brokerage: 'Realtors360 AI',
      phone: '',
      email: 'support@realtors360.ai',
    },
    content: {
      subject: `Your Weekly Email Digest — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      intro: `Here's your email marketing performance for the past 7 days.`,
      body: [
        `Top engaged contacts: ${topContactsList}.`,
        stats.agentDecisions.total > 0
          ? `AI agent made ${stats.agentDecisions.total} decisions: ${stats.agentDecisions.approved} approved, ${stats.agentDecisions.rejected} rejected.`
          : '',
        stats.totalCost > 0
          ? `Total AI cost this week: $${stats.totalCost.toFixed(4)}.`
          : '',
      ].filter(Boolean).join(' '),
      ctaText: 'View Full Analytics',
      ctaUrl: '/newsletters/analytics',
    },
    market: {
      avgPrice: `${stats.emailsSent}`,
      avgDom: stats.opens,
      inventoryChange: `${stats.clickRate}% click rate`,
      recentSales: [],
      priceComparison: {
        listing: `${stats.openRate}%`,
        average: `${stats.clickRate}%`,
        diff: `${stats.bounces} bounces`,
      },
    },
  };
}

export async function runWeeklyDigest(): Promise<void> {
  const start = Date.now();
  logger.info('cron: weekly-digest starting');

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all active realtors
    const { data: realtors, error: realtorErr } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('is_active', true);

    if (realtorErr) {
      logger.error({ err: realtorErr }, 'cron: weekly-digest — failed to fetch realtors');
      return;
    }

    if (!realtors || realtors.length === 0) {
      logger.debug('cron: weekly-digest — no active realtors');
      return;
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const realtor of realtors) {
      if (!realtor.email) {
        skipped++;
        continue;
      }

      try {
        const stats = await gatherRealtorStats(realtor.id, since);

        // Skip if no activity at all
        if (stats.emailsSent === 0 && stats.agentDecisions.total === 0) {
          skipped++;
          continue;
        }

        const emailData = buildDigestEmailData(
          (realtor.name as string) ?? 'Realtor',
          stats
        );

        const html = assembleEmail('realtor_digest', emailData);

        await sendEmail({
          to: realtor.email,
          subject: emailData.content.subject,
          html,
          tags: [
            { name: 'email_type', value: 'realtor_digest' },
            { name: 'realtor_id', value: realtor.id },
          ],
        });

        sent++;
        logger.info(
          { realtorId: realtor.id, emailsSent: stats.emailsSent },
          'cron: weekly-digest — sent to realtor'
        );
      } catch (err) {
        logger.error(
          { err, realtorId: realtor.id },
          'cron: weekly-digest — failed for realtor, continuing'
        );
        captureException(err instanceof Error ? err : new Error(String(err)), { cron: 'weekly-digest', realtorId: realtor.id });
        failed++;
      }
    }

    logger.info(
      { total: realtors.length, sent, skipped, failed, durationMs: Date.now() - start },
      'cron: weekly-digest complete'
    );
  } catch (err) {
    logger.error({ err, durationMs: Date.now() - start }, 'cron: weekly-digest threw');
    captureException(err instanceof Error ? err : new Error(String(err)), { cron: 'weekly-digest' });
  }
}
