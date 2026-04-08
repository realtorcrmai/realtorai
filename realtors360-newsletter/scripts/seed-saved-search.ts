import { supabase } from '../src/lib/supabase.js';
import { config } from '../src/config.js';
import { logger } from '../src/lib/logger.js';

/**
 * Seeds a saved search for the test contact + an active listing that
 * matches it. Run before `npm run canary`.
 */
async function main(): Promise<void> {
  logger.info({ contact: config.TEST_CONTACT_ID, realtor: config.DEMO_REALTOR_ID }, 'seed: starting');

  // Upsert a saved search
  const { data: search, error: searchErr } = await supabase
    .from('saved_searches')
    .upsert(
      {
        realtor_id: config.DEMO_REALTOR_ID,
        contact_id: config.TEST_CONTACT_ID,
        name: 'Vancouver 2BR Under 900k',
        criteria: {
          max_price: 900_000,
          beds_min: 2,
          baths_min: 1,
        },
        enabled: true,
      },
      { onConflict: 'realtor_id,contact_id,name' }
    )
    .select('id')
    .single();

  if (searchErr) {
    logger.error({ err: searchErr }, 'seed: failed to upsert saved search');
    process.exit(1);
  }

  logger.info({ search_id: search.id }, 'seed: saved search ready');

  // Find a matching active listing (don't create one — use what's there)
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('id, address, list_price')
    .eq('status', 'active')
    .lte('list_price', 900_000)
    .gte('beds', 2)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (listingErr || !listing) {
    logger.warn(
      'seed: no matching active listing found — the cron will produce no events. Add an active listing under $900k with beds≥2 to test.'
    );
    return;
  }

  logger.info({ listing }, 'seed: matching listing exists');
}

main().catch((err) => {
  logger.error({ err }, 'seed: fatal');
  process.exit(1);
});
