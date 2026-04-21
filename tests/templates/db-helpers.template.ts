/**
 * Database Test Helpers — Realtors360 CRM
 *
 * Uses Supabase admin client (bypasses RLS) for test assertions.
 * Import from: tests/helpers/db-helpers.ts
 *
 * Usage:
 *   import { db } from '../helpers/db-helpers';
 *   const contact = await db.contacts.findById('uuid');
 *   expect(contact).not.toBeNull();
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Admin client — bypasses RLS for test assertions
const supabaseAdmin: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// === Contacts ===
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

// === Listings ===
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

// === Appointments (Showings) ===
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

// === Communications ===
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

// === Notifications ===
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

// === Newsletters ===
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

// === Users ===
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

// === Seller Identities ===
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

// === Utility Functions ===

/**
 * Assert a row exists in a table matching the given conditions
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
 * Assert a row does NOT exist in a table
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
 * Assert row count in a table
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
 * Clean up all test data (call in afterAll)
 */
export async function cleanupAllTestData() {
  await contacts.deleteTestData();
  await listings.deleteTestData();
  await appointments.deleteTestData();
}

// Export grouped namespace
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
  cleanupAllTestData,
  admin: supabaseAdmin,
};
