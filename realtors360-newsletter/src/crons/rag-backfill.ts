import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';
import { backfillAll } from '../shared/rag/ingestion.js';
import { logVoyageUsage, voyageUsageStats } from '../lib/voyage.js';

/**
 * Cron: rag-backfill
 *
 * Schedule: weekly, Sunday 03:00 Vancouver (registered in `crons/index.ts`).
 *
 * Ported from `realestate-crm/src/app/api/cron/rag-backfill/route.ts`
 * (M3-B). Behaviour preserved exactly: walks 10 source tables, finds
 * unembedded records, embeds them in 50-record batches with 200ms throttle.
 *
 * Differences from CRM original:
 *   - Runs as a node-cron job, not an HTTP POST handler
 *   - Skipped entirely if FLAG_RAG_BACKFILL=off (feature flag for safe rollout)
 *   - Logs Voyage usage stats at the end so cost is visible per run
 *   - Uses pino structured logging instead of console.log
 *
 * Idempotency: the underlying `ingestFromRecord` uses content-hash dedup, so
 * running twice in a day is safe — chunks unchanged since the last run are
 * skipped, not re-embedded.
 */
export async function runRagBackfill(): Promise<void> {
  if (config.FLAG_RAG_BACKFILL !== 'on') {
    logger.info('cron/rag-backfill: flag disabled, skipping');
    return;
  }

  const startedAt = Date.now();
  logger.info('cron/rag-backfill: starting');

  const tokensBefore = voyageUsageStats.totalTokens;
  const callsBefore = voyageUsageStats.totalCalls;

  try {
    const result = await backfillAll(supabase, 50);
    logger.info(
      {
        ...result,
        ms: Date.now() - startedAt,
        voyage_tokens_this_run: voyageUsageStats.totalTokens - tokensBefore,
        voyage_calls_this_run: voyageUsageStats.totalCalls - callsBefore,
      },
      'cron/rag-backfill: complete'
    );
    logVoyageUsage();
  } catch (err) {
    logger.error({ err, ms: Date.now() - startedAt }, 'cron/rag-backfill: fatal');
  }
}
