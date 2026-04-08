import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { checkSavedSearches } from './check-saved-searches.js';
import { checkBirthdays } from './check-birthdays.js';
import { runRagBackfill } from './rag-backfill.js';
import { runWeeklyLearning } from './weekly-learning.js';
import { runAgentScoring } from './agent-scoring.js';

/**
 * Cron registry.
 *
 * M1: check-saved-searches every 15 minutes.
 * M2: check-birthdays daily at 8 AM Vancouver time.
 * M3-B: rag-backfill weekly Sunday 03:00 Vancouver (gated on FLAG_RAG_BACKFILL).
 * M3-C: weekly-learning Monday 06:00 Vancouver (gated on FLAG_WEEKLY_LEARNING).
 * M3-D: agent-scoring every 15 min Vancouver (gated on FLAG_AGENT_SCORING).
 * M3-E will add the last migrated CRM cron (process-workflows) — highest
 * risk, lands last with the most validation behind it. Each is gated on
 * its own feature flag for safe rollout.
 *
 * node-cron uses the host's local timezone unless overridden. We always pass
 * the explicit timezone option so production behaviour matches dev.
 */
export function startCrons(): void {
  cron.schedule('*/15 * * * *', () => {
    checkSavedSearches().catch((err) =>
      logger.error({ err }, 'cron: check-saved-searches threw')
    );
  });
  logger.info('cron: registered check-saved-searches (*/15 * * * *)');

  cron.schedule(
    '0 8 * * *',
    () => {
      checkBirthdays().catch((err) => logger.error({ err }, 'cron: check-birthdays threw'));
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info('cron: registered check-birthdays (0 8 * * * America/Vancouver)');

  // M3-B: rag-backfill (weekly, Sunday 3 AM Vancouver). Always registered;
  // the cron itself short-circuits when FLAG_RAG_BACKFILL=off, so toggling
  // the flag is a one-env-var change with no redeploy.
  cron.schedule(
    '0 3 * * 0',
    () => {
      runRagBackfill().catch((err) => logger.error({ err }, 'cron: rag-backfill threw'));
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_RAG_BACKFILL },
    'cron: registered rag-backfill (0 3 * * 0 America/Vancouver)'
  );

  // M3-C: weekly-learning (Monday 6 AM Vancouver). Same flag pattern.
  cron.schedule(
    '0 6 * * 1',
    () => {
      runWeeklyLearning().catch((err) => logger.error({ err }, 'cron: weekly-learning threw'));
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_WEEKLY_LEARNING },
    'cron: registered weekly-learning (0 6 * * 1 America/Vancouver)'
  );

  // M3-D: agent-scoring (every 15 min Vancouver). The CRM original has no
  // explicit timezone (Vercel runs UTC), but we pin Vancouver here so the
  // schedule matches the rest of the newsletter service crons and keeps
  // dev/prod identical. Cron itself short-circuits when FLAG_AGENT_SCORING
  // = off, so toggling rollout is a one-env-var change with no redeploy.
  cron.schedule(
    '*/15 * * * *',
    () => {
      runAgentScoring().catch((err) => logger.error({ err }, 'cron: agent-scoring threw'));
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_AGENT_SCORING },
    'cron: registered agent-scoring (*/15 * * * * America/Vancouver)'
  );
}
