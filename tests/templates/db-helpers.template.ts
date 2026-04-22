/**
 * Database Test Helpers — Realtors360 CRM
 *
 * Uses @supabase/supabase-js with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 * No Prisma. No ORM. Direct Supabase queries.
 *
 * Provides:
 *   - Admin client for raw DB access
 *   - Cleanup utilities: cleanupRecord(), cleanupRecords()
 *   - Factory functions: createTestContact(), createTestListing(), createTestShowing()
 *   - Table-specific query helpers (contacts, listings, appointments, etc.)
 *   - Assertion helpers: assertRowExists(), assertRowNotExists(), assertRowCount()
 *
 * Usage:
 *   import { db, createTestContact, cleanupRecord } from '../helpers/db-helpers';
 *
 *   const contact = await createTestContact({ name: 'TEST_Jane' });
 *   // ... run test assertions ...
 *   await cleanupRecord('contacts', contact.id);
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// === Admin Client (bypasses RLS) ===

const supabaseAdmin: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Default realtor ID for test data (matches auth-helpers DEMO_USER)
const DEFAULT_REALTOR_ID = '00000000-0000-0000-0000-000000000099';

// === Cleanup Utilities ===

/**
 * Delete a single record from a table by ID.
 * Safe to call even if the record doesn't exist.
 */
export async function cleanupRecord(table: string, id: string): Promise<void> {
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
  if (error && error.code !== 'PGRST116') {
    throw new Error(`cleanupRecord(${table}, ${id}) failed: ${error.message}`);
  }
}

/**
 * Delete multiple records across one or more tables.
 * Processes in order (use for FK-safe cleanup: children first, parents last).
 *
 * Usage:
 *   await cleanupRecords([
 *     { table: 'communications', id: commId },
 *     { table: 'appointments', id: showingId },
 *     { table: 'listings', id: listingId },
 *     { table: 'contacts', id: contactId },
 *   ]);
 */
export async function cleanupRecords(
  items: Array<{ table: string; id: string }>,
): Promise<void> {
  for (const { table, id } of items) {
    await cleanupRecord(table, id);
  }
}

// === Factory Functions ===

/**
 * Create a test contact with sensible defaults.
 * All factory records use TEST_ prefix for easy cleanup.
 * realtor_id is always included.
 */
export async function createTestContact(
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const defaults = {
    realtor_id: DEFAULT_REALTOR_ID,
    name: `TEST_Contact_${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    phone: `+1604555${String(Date.now()).slice(-4)}`,
    type: 'buyer',
    pref_channel: 'sms',
    notes: 'Auto-generated test contact',
  };

  const record = { ...defaults, ...overrides };
  const { data, error } = await supabaseAdmin
    .from('contacts')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(`createTestContact failed: ${error.message}`);
  return data;
}

/**
 * Create a test listing with sensible defaults.
 * realtor_id is always included.
 */
export async function createTestListing(
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const defaults = {
    realtor_id: DEFAULT_REALTOR_ID,
    address: `TEST_${Date.now()} Main St, Vancouver, BC`,
    status: 'active',
    list_price: 899000,
    property_type: 'detached',
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
  };

  const record = { ...defaults, ...overrides };
  const { data, error } = await supabaseAdmin
    .from('listings')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(`createTestListing failed: ${error.message}`);
  return data;
}

/**
 * Create a test showing (appointment) with sensible defaults.
 * Requires a listing_id — pass one or let it use a placeholder.
 * realtor_id is always included.
 */
export async function createTestShowing(
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const defaults = {
    realtor_id: DEFAULT_REALTOR_ID,
    listing_id: overrides.listing_id || '00000000-0000-0000-0000-000000000001',
    buyer_agent_name: `TEST_Agent_${Date.now()}`,
    buyer_agent_phone: `+1604555${String(Date.now()).slice(-4)}`,
    buyer_agent_email: `test-agent-${Date.now()}@example.com`,
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
  };

  const record = { ...defaults, ...overrides };
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(`createTestShowing failed: ${error.message}`);
  return data;
}

// === Table-Specific Query Helpers ===

export const contacts = {
  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`contacts.findById failed: ${error.message}`);
    return data;
  },

  async findByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(`contacts.findByEmail failed: ${error.message}`);
    return data;
  },

  async findByRealtorId(realtorId: string) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('realtor_id', realtorId);
    if (error) throw new Error(`contacts.findByRealtorId failed: ${error.message}`);
    return data;
  },

  async count(realtorId?: string) {
    let query = supabaseAdmin.from('contacts').select('*', { count: 'exact', head: true });
    if (realtorId) query = query.eq('realtor_id', realtorId);
    const { count, error } = await query;
    if (error) throw new Error(`contacts.count failed: ${error.message}`);
    return count ?? 0;
  },

  async deleteTestData() {
    const { error } = await supabaseAdmin
      .from('contacts')
      .delete()
      .like('name', 'TEST_%');
    if (error) throw new Error(`contacts.deleteTestData failed: ${error.message}`);
  },

  async insert(contact: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert(contact)
      .select()
      .single();
    if (error) throw new Error(`contacts.insert failed: ${error.message}`);
    return data;
  },
};

export const listings = {
  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`listings.findById failed: ${error.message}`);
    return data;
  },

  async findByAddress(address: string) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('address', address)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(`listings.findByAddress failed: ${error.message}`);
    return data;
  },

  async findByStatus(status: string, realtorId?: string) {
    let query = supabaseAdmin.from('listings').select('*').eq('status', status);
    if (realtorId) query = query.eq('realtor_id', realtorId);
    const { data, error } = await query;
    if (error) throw new Error(`listings.findByStatus failed: ${error.message}`);
    return data;
  },

  async deleteTestData() {
    const { error } = await supabaseAdmin
      .from('listings')
      .delete()
      .like('address', 'TEST_%');
    if (error) throw new Error(`listings.deleteTestData failed: ${error.message}`);
  },

  async insert(listing: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('listings')
      .insert(listing)
      .select()
      .single();
    if (error) throw new Error(`listings.insert failed: ${error.message}`);
    return data;
  },
};

export const appointments = {
  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`appointments.findById failed: ${error.message}`);
    return data;
  },

  async findByListingId(listingId: string) {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('listing_id', listingId);
    if (error) throw new Error(`appointments.findByListingId failed: ${error.message}`);
    return data;
  },

  async findByStatus(status: string) {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('status', status);
    if (error) throw new Error(`appointments.findByStatus failed: ${error.message}`);
    return data;
  },

  async deleteTestData() {
    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .like('buyer_agent_name', 'TEST_%');
    if (error) throw new Error(`appointments.deleteTestData failed: ${error.message}`);
  },
};

export const communications = {
  async findByContactId(contactId: string) {
    const { data, error } = await supabaseAdmin
      .from('communications')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`communications.findByContactId failed: ${error.message}`);
    return data;
  },

  async findLatestByContactId(contactId: string) {
    const { data, error } = await supabaseAdmin
      .from('communications')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(`communications.findLatest failed: ${error.message}`);
    return data;
  },
};

export const notifications = {
  async findByRealtorId(realtorId: string) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('realtor_id', realtorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`notifications.findByRealtorId failed: ${error.message}`);
    return data;
  },

  async findUnreadByRealtorId(realtorId: string) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('realtor_id', realtorId)
      .eq('is_read', false);
    if (error) throw new Error(`notifications.findUnread failed: ${error.message}`);
    return data;
  },
};

export const newsletters = {
  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('newsletters')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`newsletters.findById failed: ${error.message}`);
    return data;
  },

  async findEventsByNewsletterId(newsletterId: string) {
    const { data, error } = await supabaseAdmin
      .from('newsletter_events')
      .select('*')
      .eq('newsletter_id', newsletterId);
    if (error) throw new Error(`newsletters.findEvents failed: ${error.message}`);
    return data;
  },
};

export const users = {
  async findByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error) throw new Error(`users.findByEmail failed: ${error.message}`);
    return data;
  },

  async getRealtorId(email: string): Promise<string> {
    const user = await users.findByEmail(email);
    return user.id;
  },
};

export const sellerIdentities = {
  async findByListingId(listingId: string) {
    const { data, error } = await supabaseAdmin
      .from('seller_identities')
      .select('*')
      .eq('listing_id', listingId);
    if (error) throw new Error(`sellerIdentities.findByListingId failed: ${error.message}`);
    return data;
  },
};

// === Assertion Utilities ===

/**
 * Assert a row exists in a table matching the given conditions.
 */
export async function assertRowExists(
  table: string,
  conditions: Record<string, unknown>,
) {
  let query = supabaseAdmin.from(table).select('*');
  for (const [key, value] of Object.entries(conditions)) {
    query = query.eq(key, value as string);
  }
  const { data, error } = await query;
  if (error) throw new Error(`assertRowExists(${table}) failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      `assertRowExists(${table}) — no row found matching: ${JSON.stringify(conditions)}`,
    );
  }
  return data[0];
}

/**
 * Assert a row does NOT exist in a table.
 */
export async function assertRowNotExists(
  table: string,
  conditions: Record<string, unknown>,
) {
  let query = supabaseAdmin.from(table).select('*');
  for (const [key, value] of Object.entries(conditions)) {
    query = query.eq(key, value as string);
  }
  const { data, error } = await query;
  if (error) throw new Error(`assertRowNotExists(${table}) failed: ${error.message}`);
  if (data && data.length > 0) {
    throw new Error(
      `assertRowNotExists(${table}) — row found but expected none: ${JSON.stringify(conditions)}`,
    );
  }
}

/**
 * Assert row count in a table.
 */
export async function assertRowCount(
  table: string,
  expectedCount: number,
  conditions?: Record<string, unknown>,
) {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  if (conditions) {
    for (const [key, value] of Object.entries(conditions)) {
      query = query.eq(key, value as string);
    }
  }
  const { count, error } = await query;
  if (error) throw new Error(`assertRowCount(${table}) failed: ${error.message}`);
  if (count !== expectedCount) {
    throw new Error(
      `assertRowCount(${table}) — expected ${expectedCount} rows, got ${count}`,
    );
  }
}

/**
 * Clean up all test data prefixed with TEST_ (call in afterAll).
 */
export async function cleanupAllTestData() {
  await contacts.deleteTestData();
  await listings.deleteTestData();
  await appointments.deleteTestData();
}

// === Export Grouped Namespace ===

export const db = {
  contacts,
  listings,
  appointments,
  communications,
  notifications,
  newsletters,
  users,
  sellerIdentities,
  assertRowExists,
  assertRowNotExists,
  assertRowCount,
  cleanupRecord,
  cleanupRecords,
  cleanupAllTestData,
  createTestContact,
  createTestListing,
  createTestShowing,
  admin: supabaseAdmin,
};
