/**
 * Retry Failed Events Cron — Dead Letter Queue.
 *
 * Runs every 10 minutes. Picks up failed email_events that have not
 * exhausted their retry budget (retry_count < 3) and re-processes them
 * through the standard pipeline.
 *
 * Backoff: exponential — 2^retry_count * 5 minutes between attempts.
 * After 3 failures: status set to 'dead_letter' for manual inspection.
 */

import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { processEvent } from '../workers/process-event.js';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MINUTES = 5;
const BATCH_SIZE = 20;

type FailedEventRow = {
  id: string;
  retry_count: number;
};

export async function runRetryFailedEvents(): Promise<void> {
  const start = Date.now();
  const log = logger.child({ phase: 'retry-failed-events' });

  try {
    // Find failed events eligible for retry:
    // - status = 'failed'
    // - retry_count < 3
    // - next_retry_at is null (never retried) OR next_retry_at <= now()
    const { data: events, error } = await supabase
      .from('email_events')
      .select('id, retry_count')
      .eq('status', 'failed')
      .lt('retry_count', MAX_RETRIES)
      .or('next_retry_at.is.null,next_retry_at.lte.' + new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      log.error({ err: error }, 'retry: failed to query events');
      return;
    }

    const rows = (events ?? []) as FailedEventRow[];
    if (rows.length === 0) {
      log.debug('retry: no failed events eligible for retry');
      return;
    }

    // Atomic claim: set status='retrying' to prevent concurrent cron ticks
    // from processing the same events (TOCTOU fix).
    const claimIds = rows.map((r) => r.id);
    await supabase
      .from('email_events')
      .update({ status: 'retrying' })
      .in('id', claimIds)
      .eq('status', 'failed');

    log.info({ count: rows.length }, 'retry: processing failed events');

    let retried = 0;
    let deadLettered = 0;

    for (const row of rows) {
      const currentRetry = row.retry_count ?? 0;

      // Set to 'pending' for processEvent (already claimed via 'retrying')
      await supabase
        .from('email_events')
        .update({ status: 'pending' })
        .eq('id', row.id)
        .eq('status', 'retrying');

      try {
        await processEvent(row.id);

        // Check the resulting status — if processEvent set it back to 'failed',
        // we need to handle retry bookkeeping
        const { data: updated } = await supabase
          .from('email_events')
          .select('status')
          .eq('id', row.id)
          .maybeSingle();

        if (updated?.status === 'failed') {
          const nextRetryCount = currentRetry + 1;

          if (nextRetryCount >= MAX_RETRIES) {
            // Exhausted retries — move to dead letter
            await supabase
              .from('email_events')
              .update({
                status: 'dead_letter',
                retry_count: nextRetryCount,
                next_retry_at: null,
              })
              .eq('id', row.id);
            deadLettered++;
            log.warn({ eventId: row.id, retries: nextRetryCount }, 'retry: moved to dead_letter');
          } else {
            // Schedule next retry with exponential backoff
            const backoffMs = Math.pow(2, nextRetryCount) * BASE_BACKOFF_MINUTES * 60 * 1000;
            const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

            await supabase
              .from('email_events')
              .update({
                retry_count: nextRetryCount,
                next_retry_at: nextRetryAt,
              })
              .eq('id', row.id);
            log.info(
              { eventId: row.id, retry: nextRetryCount, next_retry_at: nextRetryAt },
              'retry: scheduled next attempt'
            );
          }
        } else {
          // processEvent succeeded — update retry_count to reflect the attempt
          await supabase
            .from('email_events')
            .update({ retry_count: currentRetry + 1, next_retry_at: null })
            .eq('id', row.id);
          retried++;
          log.info({ eventId: row.id }, 'retry: event processed successfully');
        }
      } catch (err) {
        // processEvent threw — treat as failure
        const nextRetryCount = currentRetry + 1;

        if (nextRetryCount >= MAX_RETRIES) {
          await supabase
            .from('email_events')
            .update({
              status: 'dead_letter',
              retry_count: nextRetryCount,
              next_retry_at: null,
              error_message: err instanceof Error ? err.message : String(err),
            })
            .eq('id', row.id);
          deadLettered++;
          log.warn({ eventId: row.id, err }, 'retry: moved to dead_letter after throw');
        } else {
          const backoffMs = Math.pow(2, nextRetryCount) * BASE_BACKOFF_MINUTES * 60 * 1000;
          const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

          await supabase
            .from('email_events')
            .update({
              status: 'failed',
              retry_count: nextRetryCount,
              next_retry_at: nextRetryAt,
              error_message: err instanceof Error ? err.message : String(err),
            })
            .eq('id', row.id);
          log.error({ eventId: row.id, err, next_retry_at: nextRetryAt }, 'retry: rescheduled after throw');
        }
      }
    }

    log.info(
      { retried, deadLettered, total: rows.length, durationMs: Date.now() - start },
      'retry: cycle complete'
    );
  } catch (err) {
    log.error({ err, durationMs: Date.now() - start }, 'retry: cron threw');
  }
}
