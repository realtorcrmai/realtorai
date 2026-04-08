import { supabase } from '../lib/supabase.js';
import { config } from '../config.js';
import { buildSavedSearchUserPrompt } from '../orchestrator/prompts.js';
import { runPipeline, type EventRow, type PipelineResult } from './_runner.js';

/**
 * Saved-search-match pipeline.
 *
 * Triggered by: cron `check-saved-searches` when a new active listing matches
 * a buyer's saved search.
 *
 * Recipient: the buyer (event.contact_id is set when the cron emits the event).
 */
export async function runSavedSearchMatch(event: EventRow): Promise<PipelineResult> {
  if (config.FLAG_SAVED_SEARCH !== 'on') {
    return { ok: false, reason: 'flag disabled' };
  }

  return runPipeline(event, {
    eventType: 'listing_matched_search',
    resolveRecipientContactId: (e) =>
      e.contact_id ?? (e.event_data.contact_id as string | undefined) ?? null,
    buildPrompt: async ({ event: e, contact, realtor }) => {
      const listingId = e.listing_id ?? (e.event_data.listing_id as string | undefined);
      const matchCount = (e.event_data.match_count as number | undefined) ?? 1;

      let listingAddress = 'a new property';
      if (listingId) {
        const { data } = await supabase
          .from('listings')
          .select('address')
          .eq('id', listingId)
          .maybeSingle();
        if (data?.address) listingAddress = data.address;
      }

      const firstName = (contact.name ?? '').split(' ')[0] || 'there';
      return buildSavedSearchUserPrompt({
        contactFirstName: firstName,
        realtorName: realtor.name ?? 'Your agent',
        matchedListingAddress: listingAddress,
        matchCount,
      });
    },
  });
}
