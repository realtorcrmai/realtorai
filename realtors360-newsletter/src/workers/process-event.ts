import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { runSavedSearchMatch } from '../pipelines/saved-search-match.js';
import { runListingPriceDrop } from '../pipelines/listing-price-drop.js';
import { runListingSold } from '../pipelines/listing-sold.js';
import { runShowingConfirmed } from '../pipelines/showing-confirmed.js';
import { runContactBirthday } from '../pipelines/contact-birthday.js';
import type { EventRow, PipelineResult } from '../pipelines/_runner.js';

/**
 * Routes a single email_event row to the right pipeline.
 *
 * M2 wires 5 event types. Anything else is marked `ignored` so it doesn't
 * accumulate as `pending` forever.
 */
const PIPELINES: Record<string, (event: EventRow) => Promise<PipelineResult>> = {
  listing_matched_search: runSavedSearchMatch,
  listing_price_dropped: runListingPriceDrop,
  listing_sold: runListingSold,
  showing_confirmed: runShowingConfirmed,
  contact_birthday: runContactBirthday,
};

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

  // Accept both 'pending' (legacy poll) and 'processing' (claim-based worker)
  if (event.status !== 'pending' && event.status !== 'processing') {
    logger.debug({ eventId, status: event.status }, 'process: not pending/processing, skipping');
    return;
  }

  const pipeline = PIPELINES[event.event_type];

  if (!pipeline) {
    logger.info(
      { event_type: event.event_type, eventId },
      'process: no pipeline registered — ignoring'
    );
    await supabase
      .from('email_events')
      .update({ status: 'ignored', processed_at: new Date().toISOString() })
      .eq('id', eventId);
    return;
  }

  const result = await pipeline(event);

  await supabase
    .from('email_events')
    .update({
      status: result.ok ? 'processed' : 'failed',
      processed_at: new Date().toISOString(),
      error_message: result.ok ? null : result.reason ?? 'unknown',
    })
    .eq('id', eventId);

  logger.info(
    { eventId, event_type: event.event_type, ok: result.ok, reason: result.ok ? undefined : result.reason },
    'process: done'
  );
}
