import { supabase } from '../lib/supabase.js';
import { config } from '../config.js';
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
      let listingDetails = '';
      if (listingId) {
        const { data } = await supabase
          .from('listings')
          .select('address, list_price, property_type, status, mls_number')
          .eq('id', listingId)
          .maybeSingle();
        if (data?.address) listingAddress = data.address;
        if (data) {
          const parts: string[] = [];
          if (data.list_price) parts.push(`Price: $${Number(data.list_price).toLocaleString('en-CA')}`);
          if (data.property_type) parts.push(`Type: ${data.property_type}`);
          if (data.status) parts.push(`Status: ${data.status}`);
          if (data.mls_number) parts.push(`MLS#: ${data.mls_number}`);
          listingDetails = parts.join(' | ');
        }
      }

      const firstName = (contact.name ?? '').split(' ')[0] || 'there';
      const contactEmail = contact.email ?? '';

      return `A new active listing matches a saved search for ${firstName} (${contactEmail}).

Realtor: ${realtor.name ?? 'Your agent'} (${realtor.email ?? ''})
Matched listing: ${listingAddress}
${listingDetails ? `Listing details: ${listingDetails}\n` : ''}Total matches today: ${matchCount}

Write a short personalized "saved search match" email for this contact.`;
    },
  });
}
