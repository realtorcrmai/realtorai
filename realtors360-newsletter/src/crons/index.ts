import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { checkSavedSearches } from './check-saved-searches.js';
import { checkBirthdays } from './check-birthdays.js';
import { runRagBackfill } from './rag-backfill.js';
import { runWeeklyLearning } from './weekly-learning.js';
import { runAgentScoring } from './agent-scoring.js';
import { runProcessWorkflows } from './process-workflows.js';
import { runAgentTriage } from './agent-triage.js';
import { runProcessScheduledSends } from './process-scheduled-sends.js';
import { scrapeMarketStats } from './scrape-market-stats.js';

/**
 * Cron registry.
 *
 * M1: check-saved-searches every 15 minutes.
 * M2: check-birthdays daily at 8 AM Vancouver time.
 * M3-B: rag-backfill weekly Sunday 03:00 Vancouver (gated on FLAG_RAG_BACKFILL).
 * M3-C: weekly-learning Monday 06:00 Vancouver (gated on FLAG_WEEKLY_LEARNING).
 * M3-D: agent-scoring every 15 min Vancouver (gated on FLAG_AGENT_SCORING).
 * M3-E: process-workflows every 2 min Vancouver (gated on FLAG_PROCESS_WORKFLOWS).
 *   The critical port — the whole reason this service exists (Vercel 10s timeout).
 *   Each is gated on its own feature flag for safe rollout.
 * scrape-market-stats: weekly Sunday 02:00 Vancouver (gated on FLAG_MARKET_SCRAPER).
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

  // M3-E: process-workflows (every 2 min Vancouver). THE critical port.
  // The CRM's Vercel cron times out at ~20 enrollments because each
  // enrollment may invoke Claude + Resend + Twilio sequentially. Here
  // there's no timeout — we can process hundreds. Gated on
  // FLAG_PROCESS_WORKFLOWS; when enabled, DISABLE the CRM's cron in
  // vercel.json to avoid double-processing.
  cron.schedule(
    '*/2 * * * *',
    () => {
      runProcessWorkflows().catch((err) =>
        logger.error({ err }, 'cron: process-workflows threw')
      );
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_PROCESS_WORKFLOWS },
    'cron: registered process-workflows (*/2 * * * * America/Vancouver)'
  );

  // Process scheduled sends (every 5 min Vancouver). Picks up agent_drafts
  // with status='approved' and scheduled_send_at <= now(), checks CASL
  // compliance, sends via Resend, tracks in newsletters table. No feature
  // flag — only processes explicitly approved drafts.
  cron.schedule(
    '*/5 * * * *',
    () => {
      runProcessScheduledSends().catch((err) =>
        logger.error({ err }, 'cron: process-scheduled-sends threw')
      );
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info('cron: registered process-scheduled-sends (*/5 * * * * America/Vancouver)');

  // M5: agent-triage (hourly). The newsletter agent's per-realtor triage
  // loop identifies contacts needing emails and spawns per-contact Claude
  // tool-use runs. Gated on FLAG_AGENT_TRIAGE (default off).
  cron.schedule(
    '0 * * * *',
    () => {
      runAgentTriage().catch((err) =>
        logger.error({ err }, 'cron: agent-triage threw')
      );
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_AGENT_TRIAGE },
    'cron: registered agent-triage (0 * * * * America/Vancouver)'
  );

  // scrape-market-stats (weekly, Sunday 2 AM Vancouver). Upserts BC market
  // data into market_stats_cache so the newsletter AI and agent tools can
  // reference current stats in Market Update emails. Gated on
  // FLAG_MARKET_SCRAPER (default off). Currently uses placeholder data —
  // swap for real REBGV/FVREB API when available.
  cron.schedule(
    '0 2 * * 0',
    () => {
      scrapeMarketStats().catch((err) =>
        logger.error({ err }, 'cron: scrape-market-stats threw')
      );
    },
    { timezone: 'America/Vancouver' }
  );
  logger.info(
    { flag: config.FLAG_MARKET_SCRAPER },
    'cron: registered scrape-market-stats (0 2 * * 0 America/Vancouver)'
  );
}
