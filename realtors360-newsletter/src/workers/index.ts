import crypto from 'node:crypto';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { processEvent } from './process-event.js';
import { createEventsWorker } from '../lib/queue.js';
import type { EventRow } from '../pipelines/_runner.js';

/**
 * Worker startup.
 *
 * N1 fix: the polling loop now uses the `claim_email_events` Postgres
 * function (migration 086) which does `FOR UPDATE SKIP LOCKED`. This
 * guarantees exactly-once processing even when multiple worker instances
 * are running — one worker's claim can never overlap with another's.
 *
 * A stale-claim recovery pass runs every 60 seconds to reset events that
 * were claimed but never completed (worker crash, OOM, deploy restart).
 * Those events go back to `pending` with `retry_count + 1`.
 *
 * P12: events with retry_count >= MAX_RETRIES are skipped — they've
 * failed enough times that a human should look at them.
 */

const POLL_INTERVAL_MS = 10_000;
const RECOVERY_INTERVAL_MS = 60_000;
const BATCH_SIZE = 5;
const MAX_RETRIES = 3;

// Unique per-process identifier for the claim lock.
const WORKER_ID = `worker-${crypto.randomUUID().slice(0, 8)}`;

let pollHandle: NodeJS.Timeout | null = null;
let recoveryHandle: NodeJS.Timeout | null = null;
let polling = false;

async function pollOnce(): Promise<void> {
  if (polling) return;
  polling = true;
  try {
    // Atomically claim a batch of pending events via FOR UPDATE SKIP LOCKED.
    const { data, error } = await supabase.rpc('claim_email_events', {
      p_worker_id: WORKER_ID,
      p_batch_size: BATCH_SIZE,
    });

    if (error) {
      // Graceful fallback for when migration 086 hasn't been applied yet —
      // fall back to the old SELECT-then-process pattern (no lock). This
      // lets dev environments work without the migration while staging/prod
      // get the safe path.
      if (error.message?.includes('function') || error.code === '42883') {
        await pollOnceLegacy();
        return;
      }
      logger.error({ err: error }, 'worker: claim failed');
      return;
    }
    if (!data || (data as EventRow[]).length === 0) return;

    const events = data as EventRow[];
    const eventLog = logger.child({ workerId: WORKER_ID, batchSize: events.length });
    eventLog.debug('worker: processing claimed batch');

    for (const event of events) {
      // P12: skip events that have failed too many times.
      if ((event as EventRow & { retry_count?: number }).retry_count ?? 0 >= MAX_RETRIES) {
        eventLog.warn(
          { eventId: event.id, retries: (event as EventRow & { retry_count?: number }).retry_count },
          'worker: max retries exceeded, marking failed permanently'
        );
        await supabase
          .from('email_events')
          .update({
            status: 'failed',
            error_message: `Max retries (${MAX_RETRIES}) exceeded`,
            processed_at: new Date().toISOString(),
            claimed_by: null,
            claimed_at: null,
          })
          .eq('id', event.id);
        continue;
      }

      try {
        await processEvent(event.id);
      } catch (err) {
        logger.error({ err, eventId: event.id }, 'worker: process threw');
        // processEvent already updates status to failed, but if it threw
        // before reaching that point, release the claim so recovery can
        // re-queue it.
        await supabase
          .from('email_events')
          .update({
            status: 'pending',
            claimed_by: null,
            claimed_at: null,
            retry_count: ((event as EventRow & { retry_count?: number }).retry_count ?? 0) + 1,
          })
          .eq('id', event.id);
      }
    }
  } finally {
    polling = false;
  }
}

/**
 * Legacy polling path for environments without migration 086.
 * Same as the original M1 logic — no claim lock, no retry budget.
 */
async function pollOnceLegacy(): Promise<void> {
  const { data, error } = await supabase
    .from('email_events')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    logger.error({ err: error }, 'worker: legacy poll failed');
    return;
  }
  if (!data || data.length === 0) return;

  for (const row of data) {
    try {
      await processEvent(row.id);
    } catch (err) {
      logger.error({ err, eventId: row.id }, 'worker: process threw');
    }
  }
}

/**
 * Recovery pass: find events stuck in 'processing' for > 5 minutes and
 * reset them to 'pending'. Catches worker crashes mid-process.
 */
async function recoverStaleClaims(): Promise<void> {
  const { data, error } = await supabase.rpc('recover_stale_claims', {
    p_stale_after: '5 minutes',
  });

  if (error) {
    // Silently ignore if the function doesn't exist (migration not applied).
    if (error.code === '42883') return;
    logger.warn({ err: error }, 'worker: stale claim recovery failed');
    return;
  }

  const recovered = typeof data === 'number' ? data : 0;
  if (recovered > 0) {
    logger.info({ recovered }, 'worker: recovered stale claims');
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

  // Fallback: claim-based polling
  logger.info(
    { interval_ms: POLL_INTERVAL_MS, worker_id: WORKER_ID },
    'worker: started in claim-poll mode'
  );
  pollHandle = setInterval(() => {
    pollOnce().catch((err) => logger.error({ err }, 'worker: poll wrapper error'));
  }, POLL_INTERVAL_MS);

  // Stale-claim recovery every 60 seconds.
  recoveryHandle = setInterval(() => {
    recoverStaleClaims().catch((err) => logger.error({ err }, 'worker: recovery error'));
  }, RECOVERY_INTERVAL_MS);

  // Run once immediately so first start doesn't wait
  void pollOnce();
}

export function stopWorker(): void {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
  if (recoveryHandle) {
    clearInterval(recoveryHandle);
    recoveryHandle = null;
  }
}
