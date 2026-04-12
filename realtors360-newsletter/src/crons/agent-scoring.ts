import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { captureException } from '../lib/sentry.js';
import { scoreBatch } from '../shared/ai-agent/lead-scorer.js';

/**
 * Cron: agent-scoring
 *
 * Schedule: daily at 07:00 Vancouver (registered in `crons/index.ts`).
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

  // Delta-only scoring: only fetch contacts whose updated_at is newer than
  // their last scored_at timestamp (or who have never been scored). This
  // avoids burning Claude API tokens re-scoring contacts with no new activity.
  //
  // PostgREST doesn't support cross-column comparisons or JSONB casts in
  // filters, so we use an RPC-style raw query via `.rpc()` — but to keep
  // things simple and avoid a new DB function, we fetch the two populations
  // separately and merge (never-scored + updated-since-last-score).

  // Population 1: never scored (ai_lead_score IS NULL)
  const { data: neverScored, error: fetchErr1 } = await supabase
    .from('contacts')
    .select('id')
    .not('email', 'is', null)
    .eq('newsletter_unsubscribed', false)
    .is('ai_lead_score', null)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (fetchErr1) {
    logger.error({ err: fetchErr1 }, 'cron/agent-scoring: never-scored fetch failed');
    captureException(new Error(fetchErr1.message), { cron: 'agent-scoring' });
    return;
  }

  // Population 2: scored before, but updated_at > scored_at (new activity).
  // We fetch contacts that have a score and filter in-app since PostgREST
  // can't compare updated_at against a JSONB-extracted timestamp.
  const remaining = 50 - (neverScored?.length ?? 0);
  let deltaIds: string[] = [];

  if (remaining > 0) {
    const { data: scoredContacts, error: fetchErr2 } = await supabase
      .from('contacts')
      .select('id, updated_at, ai_lead_score')
      .not('email', 'is', null)
      .eq('newsletter_unsubscribed', false)
      .not('ai_lead_score', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(remaining * 2); // fetch extra to account for filtering

    if (fetchErr2) {
      logger.error({ err: fetchErr2 }, 'cron/agent-scoring: delta fetch failed');
      captureException(new Error(fetchErr2.message), { cron: 'agent-scoring' });
      return;
    }

    for (const c of scoredContacts ?? []) {
      if (deltaIds.length >= remaining) break;
      const score = c.ai_lead_score as { scored_at?: string } | null;
      const scoredAt = score?.scored_at;
      if (!scoredAt || new Date(c.updated_at as string) > new Date(scoredAt)) {
        deltaIds.push(c.id as string);
      }
    }
  }

  const contactsToScore = [
    ...(neverScored ?? []).map((c) => c.id as string),
    ...deltaIds,
  ].slice(0, 50);

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
