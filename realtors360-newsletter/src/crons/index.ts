import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { recordCronRun } from '../lib/cron-tracker.js';
import { checkSavedSearches } from './check-saved-searches.js';
import { checkBirthdays } from './check-birthdays.js';
import { runRagBackfill } from './rag-backfill.js';
import { runWeeklyLearning } from './weekly-learning.js';
import { runAgentScoring } from './agent-scoring.js';
import { runProcessWorkflows } from './process-workflows.js';
import { runAgentTriage } from './agent-triage.js';
import { runProcessScheduledSends } from './process-scheduled-sends.js';
import { scrapeMarketStats } from './scrape-market-stats.js';
import { runWeeklyDigest } from './weekly-digest.js';

/**
 * Helper: wraps a cron handler with timing + cron-tracker recording.
 * Every cron automatically records its duration and success/failure.
 */
function tracked(name: string, fn: () => Promise<void>): () => void {
  return () => {
    const start = Date.now();
    fn()
      .then(() => {
        recordCronRun(name, Date.now() - start, true);
      })
      .catch((err) => {
        recordCronRun(name, Date.now() - start, false, (err as Error).message);
        logger.error({ err }, `cron: ${name} threw`);
      });
  };
}

/**
 * Cron registry.
 *
 * M1: check-saved-searches every 15 minutes.
 * M2: check-birthdays daily at 8 AM Vancouver time.
 * M3-B: rag-backfill weekly Sunday 03:00 Vancouver (gated on FLAG_RAG_BACKFILL).
 * M3-C: weekly-learning Monday 06:00 Vancouver (gated on FLAG_WEEKLY_LEARNING).
 * M3-D: agent-scoring daily 07:00 Vancouver (gated on FLAG_AGENT_SCORING).
 * M3-E: process-workflows every 2 min Vancouver (gated on FLAG_PROCESS_WORKFLOWS).
 *   The critical port — the whole reason this service exists (Vercel 10s timeout).
 *   Each is gated on its own feature flag for safe rollout.
 * scrape-market-stats: weekly Sunday 02:00 Vancouver (gated on FLAG_MARKET_SCRAPER).
 *
 * node-cron uses the host's local timezone unless overridden. We always pass
 * the explicit timezone option so production behaviour matches dev.
 */
export function startCrons(): void {
  cron.schedule('*/15 * * * *', tracked('check-saved-searches', checkSavedSearches));
  logger.info('cron: registered check-saved-searches (*/15 * * * *)');

  cron.schedule(
    '0 8 * * *',
    tracked('check-birthdays', checkBirthdays),
    { timezone: 'America/Vancouver' }
  );
  logger.info('cron: registered check-birthdays (0 8 * * * America/Vancouver)');

  cron.schedule(
    '0 3 * * 0',
    tracked('rag-backfill', runRagBackfill),
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_RAG_BACKFILL },
    'cron: registered rag-backfill (0 3 * * 0 America/Vancouver)'
  );

  cron.schedule(
    '0 6 * * 1',
    tracked('weekly-learning', runWeeklyLearning),
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_WEEKLY_LEARNING },
    'cron: registered weekly-learning (0 6 * * 1 America/Vancouver)'
  );

  cron.schedule(
    '0 7 * * *',
    tracked('agent-scoring', runAgentScoring),
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_AGENT_SCORING },
    'cron: registered agent-scoring (0 7 * * * America/Vancouver)'
  );

  cron.schedule(
    '*/2 * * * *',
    tracked('process-workflows', runProcessWorkflows),
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_PROCESS_WORKFLOWS },
    'cron: registered process-workflows (*/2 * * * * America/Vancouver)'
  );

  cron.schedule(
    '*/5 * * * *',
    tracked('process-scheduled-sends', runProcessScheduledSends),
    { timezone: 'America/Vancouver' }
  );
  logger.info('cron: registered process-scheduled-sends (*/5 * * * * America/Vancouver)');

  cron.schedule(
    '0 8 * * *',
    tracked('agent-triage', runAgentTriage),
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_AGENT_TRIAGE },
    'cron: registered agent-triage (0 8 * * * America/Vancouver)'
  );

  cron.schedule(
    '0 2 * * 0',
    tracked('scrape-market-stats', scrapeMarketStats),
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_MARKET_SCRAPER },
    'cron: registered scrape-market-stats (0 2 * * 0 America/Vancouver)'
  );

  cron.schedule(
    '0 8 * * 1',
    tracked('weekly-digest', runWeeklyDigest),
    { timezone: 'America/Vancouver' }
  );
  logger.info('cron: registered weekly-digest (0 8 * * 1 America/Vancouver)');

  // Also register retry-failed-events — it's in the cron folder but was
  // previously only registered inline. Import and track it.
  import('./retry-failed-events.js').then(({ runRetryFailedEvents }) => {
    cron.schedule(
      '*/10 * * * *',
      tracked('retry-failed-events', runRetryFailedEvents),
      { timezone: 'America/Vancouver' }
    );
    logger.info('cron: registered retry-failed-events (*/10 * * * * America/Vancouver)');
  });
}
