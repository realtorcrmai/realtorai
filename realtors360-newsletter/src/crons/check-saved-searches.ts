import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

/**
 * Cron: check-saved-searches
 *
 * Schedule: every 15 minutes (registered in `crons/index.ts`).
 *
 * For every enabled saved_search:
 *   1. SELECT listings created since last check that match the criteria
 *   2. For each match, INSERT an `email_events` row with type
 *      `listing_matched_search`
 *   3. UPDATE saved_searches.last_match_check
 *
 * The criteria match is intentionally simple in M1 — supports min_price,
 * max_price, beds_min, baths_min, areas[], prop_types[]. Anything more
 * sophisticated lands in M4 with proper geo + score-based ranking.
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
    return;
  }
  if (!searches || searches.length === 0) {
    logger.debug('cron/saved-searches: no enabled searches');
    return;
  }

  logger.info({ count: searches.length }, 'cron/saved-searches: scanning');

  let totalEvents = 0;
  for (const search of searches) {
    const criteria = (search.criteria as Criteria) ?? {};
    const since = search.last_match_check ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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
    if (!matches || matches.length === 0) {
      await supabase
        .from('saved_searches')
        .update({ last_match_check: new Date().toISOString(), last_match_count: 0 })
        .eq('id', search.id);
      continue;
    }

    // Emit one event per matched listing
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
        logger.error({ err: insertErr }, 'cron/saved-searches: event insert failed');
        continue;
      }
      totalEvents++;
    }

    await supabase
      .from('saved_searches')
      .update({
        last_match_check: new Date().toISOString(),
        last_match_count: matches.length,
      })
      .eq('id', search.id);
  }

  logger.info(
    { searches: searches.length, events: totalEvents, ms: Date.now() - startedAt },
    'cron/saved-searches: complete'
  );
}
