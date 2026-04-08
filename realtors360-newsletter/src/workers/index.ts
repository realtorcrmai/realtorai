import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { processEvent } from './process-event.js';
import { createEventsWorker } from '../lib/queue.js';

/**
 * Worker startup.
 *
 * M1 in-process mode: poll `email_events` every 10 seconds and process any
 * `pending` rows. M2+ will use BullMQ if REDIS_URL is configured.
 */

const POLL_INTERVAL_MS = 10_000;
const BATCH_SIZE = 5;

let pollHandle: NodeJS.Timeout | null = null;
let polling = false;

async function pollOnce(): Promise<void> {
  if (polling) return; // overlap guard
  polling = true;
  try {
    const { data, error } = await supabase
      .from('email_events')
      .select('id')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      logger.error({ err: error }, 'worker: poll failed');
      return;
    }
    if (!data || data.length === 0) return;

    logger.debug({ count: data.length }, 'worker: processing batch');
    for (const row of data) {
      try {
        await processEvent(row.id);
      } catch (err) {
        logger.error({ err, eventId: row.id }, 'worker: process threw');
      }
    }
  } finally {
    polling = false;
  }
}

export function startWorker(): void {
  // Try BullMQ first (no-op in M1 since REDIS_URL is typically unset locally)
  const bullWorker = createEventsWorker(async (job) => {
    await processEvent(job.data.eventId);
  });

  if (bullWorker) {
    logger.info('worker: started in BullMQ mode');
    return;
  }

  // Fallback: in-process polling
  logger.info({ interval_ms: POLL_INTERVAL_MS }, 'worker: started in polling mode');
  pollHandle = setInterval(() => {
    pollOnce().catch((err) => logger.error({ err }, 'worker: poll wrapper error'));
  }, POLL_INTERVAL_MS);

  // Run once immediately so first start doesn't wait
  void pollOnce();
}

export function stopWorker(): void {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}
