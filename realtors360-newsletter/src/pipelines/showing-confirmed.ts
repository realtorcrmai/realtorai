import { supabase } from '../lib/supabase.js';
import { buildShowingConfirmedUserPrompt } from '../orchestrator/prompts.js';
import { runPipeline, type EventRow, type PipelineResult } from './_runner.js';

/**
 * Showing-confirmed pipeline.
 *
 * Triggered by: CRM `updateShowingStatus` when an appointment moves to "confirmed".
 * Recipient: the seller of the listing being shown (event_data.seller_id).
 */
export async function runShowingConfirmed(event: EventRow): Promise<PipelineResult> {
  return runPipeline(event, {
    eventType: 'showing_confirmed',
    resolveRecipientContactId: (e) =>
      (e.event_data.seller_id as string | undefined) ?? e.contact_id ?? null,
    buildPrompt: async ({ event: e, contact, realtor }) => {
      const listingId = e.listing_id ?? (e.event_data.listing_id as string | undefined);
      const startTime = (e.event_data.start_time as string | undefined) ?? new Date().toISOString();

      let address = 'your listing';
      if (listingId) {
        const { data } = await supabase
          .from('listings')
          .select('address')
          .eq('id', listingId)
          .maybeSingle();
        if (data?.address) address = data.address;
      }

      return buildShowingConfirmedUserPrompt({
        sellerFirstName: (contact.name ?? '').split(' ')[0] || 'there',
        realtorName: realtor.name ?? 'Your agent',
        listingAddress: address,
        showingTimeIso: startTime,
      });
    },
  });
}
