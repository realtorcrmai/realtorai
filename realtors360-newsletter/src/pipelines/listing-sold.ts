import { supabase } from '../lib/supabase.js';
import { buildListingSoldUserPrompt } from '../orchestrator/prompts.js';
import { runPipeline, type EventRow, type PipelineResult } from './_runner.js';

/**
 * Listing-sold pipeline.
 *
 * Triggered by: CRM `updateListingStatus` action when status transitions to "sold".
 * Recipient: the seller (event_data.seller_id).
 */
export async function runListingSold(event: EventRow): Promise<PipelineResult> {
  return runPipeline(event, {
    eventType: 'listing_sold',
    resolveRecipientContactId: (e) =>
      (e.event_data.seller_id as string | undefined) ?? e.contact_id ?? null,
    buildPrompt: async ({ event: e, contact, realtor }) => {
      const listingId = e.listing_id ?? (e.event_data.listing_id as string | undefined);

      let address = 'your home';
      if (listingId) {
        const { data } = await supabase
          .from('listings')
          .select('address')
          .eq('id', listingId)
          .maybeSingle();
        if (data?.address) address = data.address;
      }

      return buildListingSoldUserPrompt({
        sellerFirstName: (contact.name ?? '').split(' ')[0] || 'there',
        realtorName: realtor.name ?? 'Your agent',
        listingAddress: address,
      });
    },
  });
}
