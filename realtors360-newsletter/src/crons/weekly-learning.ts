import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { captureException } from '../lib/sentry.js';
import { runLearningCycle, updateContactIntelligence } from '../shared/learning/engine.js';

/**
 * Cron: weekly-learning
 *
 * Schedule: weekly, Monday 06:00 Vancouver (registered in `crons/index.ts`).
 *
 * Ported from `realestate-crm/src/app/api/cron/weekly-learning/route.ts`
 * (M3-C). Behaviour preserved with two intentional improvements:
 *
 *   1. The newsletter query in `runLearningCycle` is now scoped by
 *      `realtor_id`. The CRM original was unscoped, which mixed all
 *      realtors together post-migration 062 (cross-tenant data leak).
 *      See M3 cron map §6.4 for the "fix bugs during port" policy.
 *
 *   2. Each per-realtor + per-contact step is wrapped in its own try/catch
 *      so one realtor's failure can't break the rest of the run. The CRM
 *      original used a single try/catch around the entire endpoint.
 *
 * Gated on FLAG_WEEKLY_LEARNING (default 'off') so the rollout is opt-in.
 *
 * The N+1 per-contact intelligence update is intentionally NOT batched in
 * this PR. M3 cron map §6.4 #3 flagged it as an optimization opportunity;
 * ship the port first, optimize after staging proves the behaviour matches.
 */
export async function runWeeklyLearning(): Promise<void> {
  if (config.FLAG_WEEKLY_LEARNING !== 'on') {
    logger.info('cron/weekly-learning: flag disabled, skipping');
    return;
  }

  const startedAt = Date.now();
  logger.info('cron/weekly-learning: starting');

  const results: Array<{
    realtorId: string;
    adjustments: number;
    suggestions: number;
    emails: number;
  }> = [];

  // 1. Find every realtor with a config row
  const { data: configs, error: configsErr } = await supabase
    .from('realtor_agent_config')
    .select('realtor_id');

  if (configsErr) {
    logger.error({ err: configsErr }, 'cron/weekly-learning: config fetch failed');
    return;
  }

  const realtorIds = (configs ?? []).map((c) => c.realtor_id as string);

  if (realtorIds.length === 0) {
    logger.info('cron/weekly-learning: no realtor_agent_config rows, nothing to do');
    return;
  }

  // 2. Run learning cycle per realtor
  for (const realtorId of realtorIds) {
    try {
      const result = await runLearningCycle(supabase, realtorId);
      results.push({
        realtorId,
        adjustments: result.autoAdjustments.length,
        suggestions: result.suggestions.length,
        emails: result.metrics.emailsAnalyzed,
      });
      logger.debug(
        { realtorId, adjustments: result.autoAdjustments.length, emails: result.metrics.emailsAnalyzed },
        'cron/weekly-learning: realtor cycle complete'
      );
    } catch (err) {
      logger.error({ err, realtorId }, 'cron/weekly-learning: realtor cycle threw');
      captureException(err instanceof Error ? err : new Error(String(err)), { cron: 'weekly-learning', realtorId });
    }
  }

  // 3. Update per-contact intelligence for every active journey
  const { data: journeys, error: jErr } = await supabase
    .from('contact_journeys')
    .select('contact_id')
    .eq('is_paused', false);

  if (jErr) {
    logger.error({ err: jErr }, 'cron/weekly-learning: journeys fetch failed');
  }

  let contactsUpdated = 0;
  let contactsFailed = 0;
  if (journeys) {
    for (const j of journeys) {
      const contactId = j.contact_id as string | null;
      if (!contactId) continue;
      try {
        await updateContactIntelligence(supabase, contactId);
        contactsUpdated++;
      } catch (err) {
        contactsFailed++;
        logger.warn({ err, contactId }, 'cron/weekly-learning: contact update threw');
      }
    }
  }

  logger.info(
    {
      realtors: realtorIds.length,
      results,
      contactsUpdated,
      contactsFailed,
      ms: Date.now() - startedAt,
    },
    'cron/weekly-learning: complete'
  );
}
