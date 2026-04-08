import { supabase } from '../src/lib/supabase.js';
import { config } from '../src/config.js';
import { logger } from '../src/lib/logger.js';
import { processEvent } from '../src/workers/process-event.js';

/**
 * Canary script: directly insert a `listing_matched_search` event for the
 * test contact, then process it inline. Skips the cron, so you can verify the
 * pipeline without waiting for the 15-minute interval.
 *
 * Resend will only deliver to the address Resend has verified for the
 * `onboarding@resend.dev` sender — currently config.CANARY_TO_EMAIL.
 */
async function main(): Promise<void> {
  // 1. Find an active listing for the test
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('id, address, list_price')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (listingErr || !listing) {
    logger.error({ err: listingErr }, 'canary: no active listing found');
    process.exit(1);
  }

  // 2. Force the test contact to use the canary email so Resend will accept the send
  await supabase
    .from('contacts')
    .update({ email: config.CANARY_TO_EMAIL })
    .eq('id', config.TEST_CONTACT_ID);

  // 3. Insert event
  const { data: event, error: insertErr } = await supabase
    .from('email_events')
    .insert({
      realtor_id: config.DEMO_REALTOR_ID,
      contact_id: config.TEST_CONTACT_ID,
      listing_id: listing.id,
      event_type: 'listing_matched_search',
      event_data: {
        listing_id: listing.id,
        contact_id: config.TEST_CONTACT_ID,
        match_count: 1,
      },
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !event) {
    logger.error({ err: insertErr }, 'canary: insert failed');
    process.exit(1);
  }

  logger.info({ event_id: event.id, listing }, 'canary: event inserted, processing inline...');

  // 4. Process inline
  await processEvent(event.id);

  // 5. Read final state
  const { data: final } = await supabase
    .from('email_events')
    .select('status, error_message, processed_at')
    .eq('id', event.id)
    .maybeSingle();

  logger.info({ final }, 'canary: complete');
}

main().catch((err) => {
  logger.error({ err }, 'canary: fatal');
  process.exit(1);
});
