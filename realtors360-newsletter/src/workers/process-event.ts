import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { runSavedSearchMatch, type EventRow } from '../pipelines/saved-search-match.js';

/**
 * Routes a single email_event row to the right pipeline.
 *
 * M1: only `listing_matched_search` is wired. Other event types are marked
 * `ignored` so they don't accumulate as pending forever.
 */
export async function processEvent(eventId: string): Promise<void> {
  const { data, error } = await supabase
    .from('email_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error || !data) {
    logger.error({ err: error, eventId }, 'process: failed to load event');
    return;
  }

  const event = data as EventRow;

  if (event.status !== 'pending') {
    logger.debug({ eventId, status: event.status }, 'process: not pending, skipping');
    return;
  }

  let result: { ok: boolean; reason?: string };

  switch (event.event_type) {
    case 'listing_matched_search':
      result = await runSavedSearchMatch(event);
      break;
    default:
      logger.info({ event_type: event.event_type, eventId }, 'process: no pipeline (M1) — ignoring');
      await supabase
        .from('email_events')
        .update({ status: 'ignored', processed_at: new Date().toISOString() })
        .eq('id', eventId);
      return;
  }

  await supabase
    .from('email_events')
    .update({
      status: result.ok ? 'processed' : 'failed',
      processed_at: new Date().toISOString(),
      error_message: result.ok ? null : result.reason ?? 'unknown',
    })
    .eq('id', eventId);

  logger.info({ eventId, ok: result.ok, reason: result.reason }, 'process: done');
}
