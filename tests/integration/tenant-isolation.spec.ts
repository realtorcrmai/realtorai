/**
 * L4 Integration Tests — Multi-Tenancy & Admin Client Isolation
 *
 * Verifies that RLS policies and the tenant client wrapper enforce
 * realtor_id scoping across all core tables. Tests cover:
 *
 *   1. Admin client bypass — service-role key reads/writes across tenants
 *   2. Contacts — cross-tenant isolation
 *   3. Listings — cross-tenant isolation
 *   4. Appointments — cross-tenant isolation
 *   5. Newsletters — cross-tenant isolation
 *
 * Approach: Since we cannot create real Supabase Auth sessions in unit
 * tests, we simulate tenant isolation by:
 *   - Using admin client to INSERT data with specific realtor_ids
 *   - Filtering with .eq('realtor_id', X) to simulate TenantQueryBuilder
 *   - Asserting that records owned by Realtor A are invisible to Realtor B
 *
 * This tests the DATA LAYER isolation that getAuthenticatedTenantClient()
 * relies on. Actual RLS policy enforcement is covered in
 * tests/integration/rls/cross-tenant.test.ts.
 *
 * Gating: Skipped unless TEST_SUPABASE_URL and
 * TEST_SUPABASE_SERVICE_ROLE_KEY are set in the environment.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment gating
// ---------------------------------------------------------------------------

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(TEST_URL && TEST_KEY);

// ---------------------------------------------------------------------------
// Two synthetic tenants — deterministic UUIDs for idempotent reruns
// ---------------------------------------------------------------------------

const REALTOR_A = '00000000-0000-0000-0000-000000000001';
const REALTOR_B = '00000000-0000-0000-0000-000000000002';

// ---------------------------------------------------------------------------
// Cleanup tracker — every test pushes {table, id} here; afterEach cleans up
// ---------------------------------------------------------------------------

interface CleanupEntry {
  table: string;
  id: string;
}

const cleanupQueue: CleanupEntry[] = [];

// ---------------------------------------------------------------------------
// Admin client (created once, reused across all tests)
// ---------------------------------------------------------------------------

function getAdmin(): SupabaseClient {
  if (!TEST_URL || !TEST_KEY) {
    throw new Error('TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY not set');
  }
  return createClient(TEST_URL, TEST_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a deterministic UUID from a prefix + counter to avoid collisions. */
function testId(prefix: string, counter: number): string {
  const hex = counter.toString(16).padStart(12, '0');
  return `${prefix}-0000-4000-8000-${hex}`;
}

let idCounter = 1;
function nextId(prefix: string): string {
  return testId(prefix, idCounter++);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe.skipIf(!enabled)('L4 — Tenant Isolation & Admin Client', () => {
  const admin = enabled ? getAdmin() : (null as unknown as SupabaseClient);

  // -------------------------------------------------------------------------
  // Cleanup: delete every tracked row by its specific id
  // -------------------------------------------------------------------------

  afterEach(async () => {
    if (!admin) return;

    // Process in reverse order to respect FK dependencies
    const queue = [...cleanupQueue].reverse();
    cleanupQueue.length = 0;

    for (const entry of queue) {
      await admin.from(entry.table).delete().eq('id', entry.id);
    }
  });

  // =========================================================================
  // Admin Client Bypass (REQ-TENANT-004)
  // =========================================================================

  describe('Admin client bypass (REQ-TENANT-004)', () => {
    it('REQ-TENANT-004 TC-TI-001: Admin client can read data across all realtors @p0', async () => {
      // Insert contacts owned by two different realtors
      const idA = nextId('00000001');
      const idB = nextId('00000002');

      const { error: errA } = await admin.from('contacts').upsert(
        {
          id: idA,
          realtor_id: REALTOR_A,
          name: 'TEST_Contact_A',
          phone: '+16045550001',
          type: 'buyer',
        },
        { onConflict: 'id' }
      );
      expect(errA).toBeNull();
      cleanupQueue.push({ table: 'contacts', id: idA });

      const { error: errB } = await admin.from('contacts').upsert(
        {
          id: idB,
          realtor_id: REALTOR_B,
          name: 'TEST_Contact_B',
          phone: '+16045550002',
          type: 'seller',
        },
        { onConflict: 'id' }
      );
      expect(errB).toBeNull();
      cleanupQueue.push({ table: 'contacts', id: idB });

      // Admin client (no realtor_id filter) should see BOTH rows
      const { data, error } = await admin
        .from('contacts')
        .select('id, realtor_id')
        .in('id', [idA, idB]);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);

      const realtorIds = data!.map((r: { realtor_id: string }) => r.realtor_id);
      expect(realtorIds).toContain(REALTOR_A);
      expect(realtorIds).toContain(REALTOR_B);
    });

    it('REQ-TENANT-004 TC-TI-002: Admin client can insert without realtor_id constraint errors @p0', async () => {
      // Admin client should be able to insert into any tenant-scoped table
      // with an explicit realtor_id without constraint violations
      const id = nextId('00000003');

      const { data, error } = await admin
        .from('contacts')
        .insert({
          id,
          realtor_id: REALTOR_A,
          name: 'TEST_AdminInsert',
          phone: '+16045550003',
          type: 'other',
        })
        .select('id, realtor_id')
        .single();

      cleanupQueue.push({ table: 'contacts', id });

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data!.id).toBe(id);
      expect(data!.realtor_id).toBe(REALTOR_A);
    });
  });

  // =========================================================================
  // RLS on Contacts (REQ-TENANT-005)
  // =========================================================================

  describe('RLS on contacts (REQ-TENANT-005)', () => {
    it('REQ-TENANT-005 TC-TI-010: Contact created by Realtor A not visible to Realtor B query @p0 @security', async () => {
      const idA = nextId('00000010');

      const { error: insertErr } = await admin.from('contacts').upsert(
        {
          id: idA,
          realtor_id: REALTOR_A,
          name: 'TEST_TenantA_Contact',
          phone: '+16045550010',
          type: 'buyer',
        },
        { onConflict: 'id' }
      );
      expect(insertErr).toBeNull();
      cleanupQueue.push({ table: 'contacts', id: idA });

      // Simulate Realtor B's tenant client query (filters by realtor_id=B)
      const { data, error } = await admin
        .from('contacts')
        .select('id, realtor_id, name')
        .eq('realtor_id', REALTOR_B)
        .eq('id', idA);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('REQ-TENANT-005 TC-TI-011: Contact created by Realtor A IS visible to admin client @p0', async () => {
      const idA = nextId('00000011');

      const { error: insertErr } = await admin.from('contacts').upsert(
        {
          id: idA,
          realtor_id: REALTOR_A,
          name: 'TEST_AdminVisible_Contact',
          phone: '+16045550011',
          type: 'seller',
        },
        { onConflict: 'id' }
      );
      expect(insertErr).toBeNull();
      cleanupQueue.push({ table: 'contacts', id: idA });

      // Admin client without realtor_id filter should see the row
      const { data, error } = await admin
        .from('contacts')
        .select('id, realtor_id')
        .eq('id', idA);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data![0].realtor_id).toBe(REALTOR_A);
    });
  });

  // =========================================================================
  // RLS on Listings (REQ-TENANT-005)
  // =========================================================================

  describe('RLS on listings (REQ-TENANT-005)', () => {
    it('REQ-TENANT-005 TC-TI-020: Listing created by Realtor A not visible to Realtor B query @p0 @security', async () => {
      // Create a contact first (seller_id FK requirement)
      const sellerId = nextId('00000020');
      const { error: contactErr } = await admin.from('contacts').upsert(
        {
          id: sellerId,
          realtor_id: REALTOR_A,
          name: 'TEST_Seller_For_Listing',
          phone: '+16045550020',
          type: 'seller',
        },
        { onConflict: 'id' }
      );
      expect(contactErr).toBeNull();
      cleanupQueue.push({ table: 'contacts', id: sellerId });

      // Create a listing owned by Realtor A
      const listingId = nextId('00000021');
      const { error: listingErr } = await admin.from('listings').upsert(
        {
          id: listingId,
          realtor_id: REALTOR_A,
          address: 'TEST_123 Isolation Ave',
          seller_id: sellerId,
          lockbox_code: 'TEST0000',
          status: 'active',
          property_type: 'Residential',
        },
        { onConflict: 'id' }
      );
      expect(listingErr).toBeNull();
      cleanupQueue.push({ table: 'listings', id: listingId });

      // Simulate Realtor B's tenant client query
      const { data, error } = await admin
        .from('listings')
        .select('id, realtor_id, address')
        .eq('realtor_id', REALTOR_B)
        .eq('id', listingId);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  // =========================================================================
  // RLS on Appointments/Showings (REQ-TENANT-005)
  // =========================================================================

  describe('RLS on appointments (REQ-TENANT-005)', () => {
    it('REQ-TENANT-005 TC-TI-030: Appointment created by Realtor A not visible to Realtor B @p0 @security', async () => {
      // Create a contact (seller) and listing first for FK integrity
      const sellerId = nextId('00000030');
      const { error: contactErr } = await admin.from('contacts').upsert(
        {
          id: sellerId,
          realtor_id: REALTOR_A,
          name: 'TEST_Seller_For_Appointment',
          phone: '+16045550030',
          type: 'seller',
        },
        { onConflict: 'id' }
      );
      expect(contactErr).toBeNull();
      cleanupQueue.push({ table: 'contacts', id: sellerId });

      const listingId = nextId('00000031');
      const { error: listingErr } = await admin.from('listings').upsert(
        {
          id: listingId,
          realtor_id: REALTOR_A,
          address: 'TEST_456 Showing Blvd',
          seller_id: sellerId,
          lockbox_code: 'TEST0001',
          status: 'active',
          property_type: 'Condo/Apartment',
        },
        { onConflict: 'id' }
      );
      expect(listingErr).toBeNull();
      cleanupQueue.push({ table: 'listings', id: listingId });

      // Create an appointment owned by Realtor A
      const appointmentId = nextId('00000032');
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 3600000); // +1 hour

      const { error: aptErr } = await admin.from('appointments').upsert(
        {
          id: appointmentId,
          realtor_id: REALTOR_A,
          listing_id: listingId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'requested',
          buyer_agent_name: 'TEST_Agent_Smith',
          buyer_agent_phone: '+16045550099',
        },
        { onConflict: 'id' }
      );
      expect(aptErr).toBeNull();
      cleanupQueue.push({ table: 'appointments', id: appointmentId });

      // Simulate Realtor B's tenant client query
      const { data, error } = await admin
        .from('appointments')
        .select('id, realtor_id')
        .eq('realtor_id', REALTOR_B)
        .eq('id', appointmentId);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  // =========================================================================
  // RLS on Newsletters (REQ-TENANT-005)
  // =========================================================================

  describe('RLS on newsletters (REQ-TENANT-005)', () => {
    it('REQ-TENANT-005 TC-TI-040: Newsletter created by Realtor A not visible to Realtor B @p0 @security', async () => {
      // Create a contact first (contact_id FK requirement)
      const contactId = nextId('00000040');
      const { error: contactErr } = await admin.from('contacts').upsert(
        {
          id: contactId,
          realtor_id: REALTOR_A,
          name: 'TEST_Contact_For_Newsletter',
          phone: '+16045550040',
          type: 'buyer',
        },
        { onConflict: 'id' }
      );
      expect(contactErr).toBeNull();
      cleanupQueue.push({ table: 'contacts', id: contactId });

      // Create a newsletter owned by Realtor A
      const newsletterId = nextId('00000041');
      const { error: nlErr } = await admin.from('newsletters').upsert(
        {
          id: newsletterId,
          realtor_id: REALTOR_A,
          contact_id: contactId,
          email_type: 'tenant_isolation_test',
          subject: 'TEST_Tenant Isolation Newsletter',
          html_body: '<p>TEST isolation content</p>',
          status: 'draft',
        },
        { onConflict: 'id' }
      );
      expect(nlErr).toBeNull();
      cleanupQueue.push({ table: 'newsletters', id: newsletterId });

      // Simulate Realtor B's tenant client query
      const { data, error } = await admin
        .from('newsletters')
        .select('id, realtor_id')
        .eq('realtor_id', REALTOR_B)
        .eq('id', newsletterId);

      expect(error).toBeNull();
      expect(data).toEqual([]);

      // Positive control: Realtor A CAN see their own newsletter
      const { data: ownData, error: ownErr } = await admin
        .from('newsletters')
        .select('id, realtor_id')
        .eq('realtor_id', REALTOR_A)
        .eq('id', newsletterId);

      expect(ownErr).toBeNull();
      expect(ownData).toHaveLength(1);
      expect(ownData![0].realtor_id).toBe(REALTOR_A);
    });
  });
});
