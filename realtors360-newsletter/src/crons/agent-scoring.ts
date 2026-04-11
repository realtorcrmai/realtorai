import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { captureException } from '../lib/sentry.js';
import { scoreBatch } from '../shared/ai-agent/lead-scorer.js';

/**
 * Cron: agent-scoring
 *
 * Schedule: every 15 minutes (registered in `crons/index.ts`).
 *
 * Ported from `realestate-crm/src/app/api/cron/agent-scoring/route.ts`
 * (M3-D). Behaviour preserved with intentional improvements (see
 * `shared/ai-agent/lead-scorer.ts` header for the full list).
 *
 * The CRM original capped each run at 50 contacts to fit Vercel's 120s
 * function timeout. On Render we have no such ceiling, but we keep the 50
 * cap for now — bumping it is a separate "tune throughput" task once the
 * shadow-mode parallel run proves the port matches CRM behaviour. M4
 * raises the limit to ~100 per the master plan §6.7 perf target.
 *
 * Gated on FLAG_AGENT_SCORING (default 'off') so rollout is opt-in.
 */
export async function runAgentScoring(): Promise<void> {
  if (config.FLAG_AGENT_SCORING !== 'on') {
    logger.info('cron/agent-scoring: flag disabled, skipping');
    return;
  }

  const startedAt = Date.now();
  logger.info('cron/agent-scoring: starting');

  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();

  // Find candidates: contacts with email, opted-in to newsletters, ordered
  // by most recently updated. We then filter in-app to only score those
  // whose `ai_lead_score.scored_at` is missing or stale (>24h).
  const { data: recentlyActive, error: fetchErr } = await supabase
    .from('contacts')
    .select('id, ai_lead_score')
    .not('email', 'is', null)
    .eq('newsletter_unsubscribed', false)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (fetchErr) {
    logger.error({ err: fetchErr }, 'cron/agent-scoring: contact fetch failed');
    captureException(new Error(fetchErr.message), { cron: 'agent-scoring' });
    return;
  }

  const candidates = recentlyActive ?? [];
  const contactsToScore: string[] = [];
  for (const c of candidates) {
    const score = c.ai_lead_score as { scored_at?: string } | null;
    if (!score || !score.scored_at) {
      contactsToScore.push(c.id as string);
      continue;
    }
    if (new Date(score.scored_at) < new Date(oneDayAgo)) {
      contactsToScore.push(c.id as string);
    }
  }

  if (contactsToScore.length === 0) {
    logger.info(
      { ms: Date.now() - startedAt },
      'cron/agent-scoring: no contacts need scoring'
    );
    return;
  }

  logger.info(
    { count: contactsToScore.length },
    'cron/agent-scoring: scoring batch'
  );

  let result: { scored: number; errors: number };
  try {
    result = await scoreBatch(supabase, contactsToScore);
  } catch (err) {
    logger.error({ err }, 'cron/agent-scoring: scoreBatch threw');
    captureException(err instanceof Error ? err : new Error(String(err)), { cron: 'agent-scoring', contactCount: contactsToScore.length });
    return;
  }

  // Expire stale pending recommendations. Mirrors the CRM original.
  const { error: expireErr, count: expiredCount } = await supabase
    .from('agent_recommendations')
    .update({ status: 'expired' }, { count: 'exact' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());

  if (expireErr) {
    logger.warn({ err: expireErr }, 'cron/agent-scoring: expire pass failed');
  }

  logger.info(
    {
      ...result,
      expired: expiredCount ?? 0,
      ms: Date.now() - startedAt,
    },
    'cron/agent-scoring: complete'
  );
}
