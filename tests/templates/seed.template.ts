/**
 * Test Data Seeding — Realtors360 CRM
 *
 * Seeds realistic test data via Supabase admin client.
 * All test data uses "TEST_" prefix for easy identification and cleanup.
 *
 * Usage:
 *   import { seed, cleanup } from '../helpers/seed';
 *
 *   beforeAll(async () => { await seed.all(); });
 *   afterAll(async () => { await cleanup.all(); });
 */
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Fixed UUIDs for deterministic test data
export const TEST_IDS = {
  realtorId: '00000000-0000-0000-0000-000000000099',
  otherRealtorId: '00000000-0000-0000-0000-000000000098',
  contacts: {
    buyer: '10000000-0000-0000-0000-000000000001',
    seller: '10000000-0000-0000-0000-000000000002',
    both: '10000000-0000-0000-0000-000000000003',
    noConsent: '10000000-0000-0000-0000-000000000004',
    otherTenant: '10000000-0000-0000-0000-000000000005',
  },
  listings: {
    active: '20000000-0000-0000-0000-000000000001',
    conditional: '20000000-0000-0000-0000-000000000002',
    sold: '20000000-0000-0000-0000-000000000003',
    otherTenant: '20000000-0000-0000-0000-000000000004',
  },
  showings: {
    pending: '30000000-0000-0000-0000-000000000001',
    confirmed: '30000000-0000-0000-0000-000000000002',
    denied: '30000000-0000-0000-0000-000000000003',
  },
  newsletters: {
    draft: '40000000-0000-0000-0000-000000000001',
    sent: '40000000-0000-0000-0000-000000000002',
  },
} as const;

// === Seed Functions ===

export const seed = {
  /**
   * Seed all test data in correct dependency order
   */
  async all() {
    await seed.contacts();
    await seed.listings();
    await seed.showings();
    await seed.newsletters();
    await seed.communications();
  },

  /**
   * Seed test contacts
   */
  async contacts() {
    const contacts = [
      {
        id: TEST_IDS.contacts.buyer,
        realtor_id: TEST_IDS.realtorId,
        name: 'TEST_Alice Buyer',
        email: 'test-alice@example.com',
        phone: '+16045551001',
        type: 'buyer',
        pref_channel: 'sms',
        casl_consent_given: true,
        casl_consent_date: '2026-01-15T00:00:00Z',
        notes: 'Looking for 3BR in Kitsilano',
      },
      {
        id: TEST_IDS.contacts.seller,
        realtor_id: TEST_IDS.realtorId,
        name: 'TEST_Bob Seller',
        email: 'test-bob@example.com',
        phone: '+16045551002',
        type: 'seller',
        pref_channel: 'whatsapp',
        casl_consent_given: true,
        casl_consent_date: '2026-02-01T00:00:00Z',
        notes: 'Selling 4BR detached in Dunbar',
      },
      {
        id: TEST_IDS.contacts.both,
        realtor_id: TEST_IDS.realtorId,
        name: 'TEST_Carol Both',
        email: 'test-carol@example.com',
        phone: '+16045551003',
        type: 'both',
        pref_channel: 'email',
        casl_consent_given: true,
        casl_consent_date: '2026-03-01T00:00:00Z',
      },
      {
        id: TEST_IDS.contacts.noConsent,
        realtor_id: TEST_IDS.realtorId,
        name: 'TEST_Dave NoConsent',
        email: 'test-dave@example.com',
        phone: '+16045551004',
        type: 'buyer',
        pref_channel: 'sms',
        casl_consent_given: false,
        casl_consent_date: null,
      },
      {
        id: TEST_IDS.contacts.otherTenant,
        realtor_id: TEST_IDS.otherRealtorId,
        name: 'TEST_Eve OtherTenant',
        email: 'test-eve@example.com',
        phone: '+16045551005',
        type: 'buyer',
        pref_channel: 'sms',
        casl_consent_given: true,
        casl_consent_date: '2026-01-01T00:00:00Z',
      },
    ];

    const { error } = await supabaseAdmin
      .from('contacts')
      .upsert(contacts, { onConflict: 'id' });

    if (error) throw new Error(`Seed contacts failed: ${error.message}`);
    return contacts;
  },

  /**
   * Seed test listings
   */
  async listings() {
    const listings = [
      {
        id: TEST_IDS.listings.active,
        realtor_id: TEST_IDS.realtorId,
        address: 'TEST_456 Oak Street, Vancouver, BC V6H 2W1',
        property_type: 'detached',
        list_price: 2100000,
        status: 'active',
        bedrooms: 4,
        bathrooms: 3,
        sqft: 2800,
        lot_size: 5500,
        year_built: 1995,
        seller_id: TEST_IDS.contacts.seller,
        mls_number: 'V1234567',
      },
      {
        id: TEST_IDS.listings.conditional,
        realtor_id: TEST_IDS.realtorId,
        address: 'TEST_789 Pine Ave, Vancouver, BC V5K 3E2',
        property_type: 'townhouse',
        list_price: 980000,
        status: 'conditional',
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1600,
      },
      {
        id: TEST_IDS.listings.sold,
        realtor_id: TEST_IDS.realtorId,
        address: 'TEST_101 Maple Crescent, Burnaby, BC V5A 1B3',
        property_type: 'condo',
        list_price: 650000,
        status: 'sold',
        bedrooms: 2,
        bathrooms: 1,
        sqft: 950,
      },
      {
        id: TEST_IDS.listings.otherTenant,
        realtor_id: TEST_IDS.otherRealtorId,
        address: 'TEST_222 Elm Drive, Surrey, BC V3T 4R5',
        property_type: 'detached',
        list_price: 1500000,
        status: 'active',
        bedrooms: 5,
        bathrooms: 4,
      },
    ];

    const { error } = await supabaseAdmin
      .from('listings')
      .upsert(listings, { onConflict: 'id' });

    if (error) throw new Error(`Seed listings failed: ${error.message}`);
    return listings;
  },

  /**
   * Seed test showings (appointments)
   */
  async showings() {
    const showings = [
      {
        id: TEST_IDS.showings.pending,
        realtor_id: TEST_IDS.realtorId,
        listing_id: TEST_IDS.listings.active,
        buyer_agent_name: 'TEST_Frank Agent',
        buyer_agent_phone: '+16045552001',
        buyer_agent_email: 'test-frank@brokerage.com',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        status: 'pending',
        notes: 'First-time buyer, very interested',
      },
      {
        id: TEST_IDS.showings.confirmed,
        realtor_id: TEST_IDS.realtorId,
        listing_id: TEST_IDS.listings.active,
        buyer_agent_name: 'TEST_Grace Agent',
        buyer_agent_phone: '+16045552002',
        buyer_agent_email: 'test-grace@brokerage.com',
        start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after
        status: 'confirmed',
        lockbox_code: '4321',
      },
      {
        id: TEST_IDS.showings.denied,
        realtor_id: TEST_IDS.realtorId,
        listing_id: TEST_IDS.listings.active,
        buyer_agent_name: 'TEST_Henry Agent',
        buyer_agent_phone: '+16045552003',
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        status: 'denied',
      },
    ];

    const { error } = await supabaseAdmin
      .from('appointments')
      .upsert(showings, { onConflict: 'id' });

    if (error) throw new Error(`Seed showings failed: ${error.message}`);
    return showings;
  },

  /**
   * Seed test newsletters
   */
  async newsletters() {
    const newsletters = [
      {
        id: TEST_IDS.newsletters.draft,
        realtor_id: TEST_IDS.realtorId,
        subject: 'TEST_Weekly Market Update - Vancouver',
        content: 'The Vancouver market continues to show strong demand...',
        status: 'draft',
        type: 'market_update',
      },
      {
        id: TEST_IDS.newsletters.sent,
        realtor_id: TEST_IDS.realtorId,
        subject: 'TEST_New Listing Alert - Oak Street',
        content: 'Exciting new listing just hit the market...',
        status: 'sent',
        type: 'listing_alert',
        sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { error } = await supabaseAdmin
      .from('newsletters')
      .upsert(newsletters, { onConflict: 'id' });

    if (error) throw new Error(`Seed newsletters failed: ${error.message}`);
    return newsletters;
  },

  /**
   * Seed test communications
   */
  async communications() {
    const comms = [
      {
        realtor_id: TEST_IDS.realtorId,
        contact_id: TEST_IDS.contacts.buyer,
        direction: 'outbound',
        channel: 'sms',
        body: 'Hi Alice, I found some great properties in Kitsilano for you!',
        related_id: TEST_IDS.listings.active,
      },
      {
        realtor_id: TEST_IDS.realtorId,
        contact_id: TEST_IDS.contacts.seller,
        direction: 'outbound',
        channel: 'whatsapp',
        body: 'Bob, you have a showing request for tomorrow at 2pm. Reply YES to confirm.',
        related_id: TEST_IDS.showings.pending,
      },
      {
        realtor_id: TEST_IDS.realtorId,
        contact_id: TEST_IDS.contacts.seller,
        direction: 'inbound',
        channel: 'whatsapp',
        body: 'YES',
      },
    ];

    const { error } = await supabaseAdmin
      .from('communications')
      .insert(comms);

    if (error) throw new Error(`Seed communications failed: ${error.message}`);
    return comms;
  },
};

// === Cleanup Functions ===

export const cleanup = {
  /**
   * Remove all test data in reverse dependency order
   */
  async all() {
    await cleanup.communications();
    await cleanup.showings();
    await cleanup.newsletters();
    await cleanup.listings();
    await cleanup.contacts();
  },

  async contacts() {
    await supabaseAdmin.from('contacts').delete().like('name', 'TEST_%');
  },

  async listings() {
    await supabaseAdmin.from('listings').delete().like('address', 'TEST_%');
  },

  async showings() {
    await supabaseAdmin.from('appointments').delete().like('buyer_agent_name', 'TEST_%');
  },

  async newsletters() {
    await supabaseAdmin.from('newsletters').delete().like('subject', 'TEST_%');
  },

  async communications() {
    // Communications cascade-delete with contacts, but clean explicitly for safety
    await supabaseAdmin
      .from('communications')
      .delete()
      .in('contact_id', Object.values(TEST_IDS.contacts));
  },
};

// === Factory Functions ===

/**
 * Create a unique contact for a single test (won't collide with others)
 */
export async function createTestContact(overrides: Record<string, unknown> = {}) {
  const id = crypto.randomUUID();
  const contact = {
    id,
    realtor_id: TEST_IDS.realtorId,
    name: `TEST_Factory_${id.slice(0, 8)}`,
    email: `test-${id.slice(0, 8)}@example.com`,
    phone: `+1604555${Math.floor(Math.random() * 9000 + 1000)}`,
    type: 'buyer',
    pref_channel: 'sms',
    casl_consent_given: true,
    casl_consent_date: new Date().toISOString(),
    ...overrides,
  };

  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert(contact)
    .select()
    .single();

  if (error) throw new Error(`createTestContact failed: ${error.message}`);
  return data;
}

/**
 * Create a unique listing for a single test
 */
export async function createTestListing(overrides: Record<string, unknown> = {}) {
  const id = crypto.randomUUID();
  const listing = {
    id,
    realtor_id: TEST_IDS.realtorId,
    address: `TEST_${Math.floor(Math.random() * 9000 + 1000)} Factory St, Vancouver, BC`,
    property_type: 'detached',
    list_price: Math.floor(Math.random() * 2000000 + 500000),
    status: 'active',
    bedrooms: 3,
    bathrooms: 2,
    ...overrides,
  };

  const { data, error } = await supabaseAdmin
    .from('listings')
    .insert(listing)
    .select()
    .single();

  if (error) throw new Error(`createTestListing failed: ${error.message}`);
  return data;
}

/**
 * Create a unique showing for a single test
 */
export async function createTestShowing(
  listingId: string = TEST_IDS.listings.active,
  overrides: Record<string, unknown> = {},
) {
  const id = crypto.randomUUID();
  const showing = {
    id,
    realtor_id: TEST_IDS.realtorId,
    listing_id: listingId,
    buyer_agent_name: `TEST_Factory_Agent_${id.slice(0, 8)}`,
    buyer_agent_phone: `+1604555${Math.floor(Math.random() * 9000 + 1000)}`,
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    ...overrides,
  };

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .insert(showing)
    .select()
    .single();

  if (error) throw new Error(`createTestShowing failed: ${error.message}`);
  return data;
}
