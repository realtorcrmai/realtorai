import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { captureException } from '../lib/sentry.js';
import { startTimer } from '../lib/timer.js';

/**
 * Cron: check-saved-searches
 *
 * Schedule: every 15 minutes (registered in `crons/index.ts`).
 *
 * N6 fix: the timestamp snapshot (`checkedAt`) is taken BEFORE the listing
 * query, then written as `last_match_check` AFTER the event inserts. This
 * closes the time-window bug where a crash between inserts and the update
 * would either re-emit events (duplicate emails) or advance the window
 * past un-emitted listings (missed emails).
 *
 * Combined with the `uq_email_events_search_match` partial unique index
 * from migration 086, duplicate events are also blocked at the DB level
 * as belt-and-suspenders.
 *
 * Each insert catches SQLSTATE 23505 and skips silently — this is the
 * idempotent-skip pattern used throughout the newsletter service.
 */

type Criteria = {
  min_price?: number;
  max_price?: number;
  beds_min?: number;
  baths_min?: number;
  areas?: string[];
  prop_types?: string[];
};

export async function checkSavedSearches(): Promise<void> {
  const startedAt = Date.now();

  const { data: searches, error } = await supabase
    .from('saved_searches')
    .select('id, realtor_id, contact_id, criteria, last_match_check')
    .eq('enabled', true);

  if (error) {
    logger.error({ err: error }, 'cron/saved-searches: query failed');
    captureException(new Error(error.message), { cron: 'check-saved-searches' });
    return;
  }
  if (!searches || searches.length === 0) {
    logger.debug('cron/saved-searches: no enabled searches');
    return;
  }

  logger.info({ count: searches.length }, 'cron/saved-searches: scanning');

  let totalEvents = 0;
  let duplicatesSkipped = 0;

  for (const search of searches) {
    const searchElapsed = startTimer();
    const criteria = (search.criteria as Criteria) ?? {};
    const since = search.last_match_check ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // N6: snapshot the timestamp BEFORE querying listings.
    const checkedAt = new Date().toISOString();

    let q = supabase
      .from('listings')
      .select('id, address, list_price, beds, baths, area, prop_type')
      .eq('status', 'active')
      .gte('created_at', since);

    if (criteria.min_price != null) q = q.gte('list_price', criteria.min_price);
    if (criteria.max_price != null) q = q.lte('list_price', criteria.max_price);
    if (criteria.beds_min != null) q = q.gte('beds', criteria.beds_min);
    if (criteria.baths_min != null) q = q.gte('baths', criteria.baths_min);
    if (criteria.areas?.length) q = q.in('area', criteria.areas);
    if (criteria.prop_types?.length) q = q.in('prop_type', criteria.prop_types);

    const { data: matches, error: matchErr } = await q.limit(10);
    if (matchErr) {
      logger.warn({ err: matchErr, search_id: search.id }, 'cron/saved-searches: match query failed');
      continue;
    }

    // Always update the checkpoint to `checkedAt`, even if no matches.
    // This advances the window consistently.
    if (!matches || matches.length === 0) {
      await supabase
        .from('saved_searches')
        .update({ last_match_check: checkedAt, last_match_count: 0 })
        .eq('id', search.id);
      continue;
    }

    // Emit one event per matched listing. 23505 (unique violation from
    // migration 086's `uq_email_events_search_match` index) = idempotent skip.
    for (const listing of matches) {
      const { error: insertErr } = await supabase.from('email_events').insert({
        realtor_id: search.realtor_id,
        contact_id: search.contact_id,
        listing_id: listing.id,
        event_type: 'listing_matched_search',
        event_data: {
          listing_id: listing.id,
          contact_id: search.contact_id,
          saved_search_id: search.id,
          match_count: matches.length,
        },
        status: 'pending',
      });

      if (insertErr) {
        if (insertErr.code === '23505') {
          duplicatesSkipped++;
          continue;
        }
        logger.error({ err: insertErr }, 'cron/saved-searches: event insert failed');
        continue;
      }
      totalEvents++;
    }

    // N6: use the pre-snapshot timestamp, not `now()`. If the process crashes
    // between the inserts and this update, next run re-emits — the unique
    // index catches duplicates.
    await supabase
      .from('saved_searches')
      .update({ last_match_check: checkedAt, last_match_count: matches.length })
      .eq('id', search.id);

    logger.debug({ searchId: search.id, matches: matches.length, durationMs: searchElapsed() }, 'cron/saved-searches: search processed');
  }

  logger.info(
    { searches: searches.length, events: totalEvents, duplicatesSkipped, ms: Date.now() - startedAt },
    'cron/saved-searches: complete'
  );
}
