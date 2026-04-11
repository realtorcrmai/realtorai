import { supabase } from '../lib/supabase.js';
import { buildPriceDropUserPrompt } from '../orchestrator/prompts.js';
import { runPipeline, type EventRow, type PipelineResult } from './_runner.js';

/**
 * Listing price-drop pipeline.
 *
 * Triggered by: CRM `updateListing` action when `list_price` changes.
 * Recipient: the seller (event_data.seller_id).
 *
 * M2 sends a confirmation to the seller. M4 will fan this out to matching
 * buyers via saved searches.
 */
export async function runListingPriceDrop(event: EventRow): Promise<PipelineResult> {
  return runPipeline(event, {
    eventType: 'listing_price_dropped',
    resolveRecipientContactId: (e) =>
      (e.event_data.seller_id as string | undefined) ?? e.contact_id ?? null,
    buildPrompt: async ({ event: e, contact, realtor }) => {
      const listingId = e.listing_id ?? (e.event_data.listing_id as string | undefined);
      const oldPrice = (e.event_data.old_price as number | null | undefined) ?? null;
      const newPrice = (e.event_data.new_price as number | null | undefined) ?? null;

      let address = 'your listing';
      if (listingId) {
        const { data } = await supabase
          .from('listings')
          .select('address')
          .eq('id', listingId)
          .maybeSingle();
        if (data?.address) address = data.address;
      }

      return buildPriceDropUserPrompt({
        sellerFirstName: (contact.name ?? '').split(' ')[0] || 'there',
        realtorName: realtor.name ?? 'Your agent',
        listingAddress: address,
        oldPrice,
        newPrice,
      });
    },
  });
}
