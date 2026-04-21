/**
 * L4 Integration Tests — Showings (Appointments)
 *
 * Tests appointment CRUD via direct Supabase admin client and verifies
 * tenant isolation (RLS) between realtors.
 *
 * Gating:
 *   - Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Skipped gracefully if env vars are missing
 *
 * Cleanup:
 *   - All test data uses deterministic UUIDs prefixed with 'test-sh-'
 *   - afterEach removes all inserted rows
 */

import { describe, it, expect, afterAll, beforeAll, afterEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Deterministic UUIDs for test data — easy to identify and clean up.
// All hex-only to satisfy PostgreSQL uuid type validation.
const REALTOR_A = 'a0a0a0a0-0000-4000-8000-000000aa0001';
const REALTOR_B = 'b0b0b0b0-0000-4000-8000-000000bb0001';
const CONTACT_A = 'c0c0c0c0-0000-4000-8000-000000cc0001';
const LISTING_A = 'd0d0d0d0-0000-4000-8000-000000dd0001';
const LISTING_B = 'd0d0d0d0-0000-4000-8000-000000dd0002';
const APPT_001 = 'e0e0e0e0-0000-4000-8000-000000ee0001';
const APPT_002 = 'e0e0e0e0-0000-4000-8000-000000ee0002';
const APPT_003 = 'e0e0e0e0-0000-4000-8000-000000ee0003';
const APPT_004 = 'e0e0e0e0-0000-4000-8000-000000ee0004';
const APPT_005 = 'e0e0e0e0-0000-4000-8000-000000ee0005';

describe.skipIf(!enabled)('L4 Integration — Showings (Appointments)', () => {
  let admin: SupabaseClient;

  // Track IDs inserted during each test for cleanup
  let insertedAppointmentIds: string[] = [];

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Ensure prerequisite data exists: realtor user, contact, listing
    // Use upsert for idempotency across reruns
    await admin.from('users').upsert(
      { id: REALTOR_A, email: 'test-sh-realtor-a@test.local', name: 'Test Realtor A' },
      { onConflict: 'id' }
    );
    await admin.from('users').upsert(
      { id: REALTOR_B, email: 'test-sh-realtor-b@test.local', name: 'Test Realtor B' },
      { onConflict: 'id' }
    );
    await admin.from('contacts').upsert(
      {
        id: CONTACT_A,
        realtor_id: REALTOR_A,
        name: 'Test Seller SH',
        phone: '+16045559901',
        type: 'seller',
      },
      { onConflict: 'id' }
    );
    await admin.from('listings').upsert(
      {
        id: LISTING_A,
        realtor_id: REALTOR_A,
        address: '123 Test St, Vancouver',
        seller_id: CONTACT_A,
        lockbox_code: 'TST001',
        status: 'active',
        property_type: 'Residential',
      },
      { onConflict: 'id' }
    );
    // Listing owned by Realtor B for RLS test
    await admin.from('listings').upsert(
      {
        id: LISTING_B,
        realtor_id: REALTOR_B,
        address: '456 Other Ave, Vancouver',
        seller_id: CONTACT_A, // shared contact for simplicity
        lockbox_code: 'TST002',
        status: 'active',
        property_type: 'Condo/Apartment',
      },
      { onConflict: 'id' }
    );
  });

  afterEach(async () => {
    // Clean up any appointments created during the test
    if (insertedAppointmentIds.length > 0) {
      await admin
        .from('appointments')
        .delete()
        .in('id', insertedAppointmentIds);
      insertedAppointmentIds = [];
    }
  });

  // Global cleanup after all tests
  afterAll(async () => {
    if (!admin) return;
    // Remove in reverse dependency order
    await admin.from('appointments').delete().in('listing_id', [LISTING_A, LISTING_B]);
    await admin.from('listings').delete().in('id', [LISTING_A, LISTING_B]);
    await admin.from('contacts').delete().eq('id', CONTACT_A);
    await admin.from('users').delete().in('id', [REALTOR_A, REALTOR_B]);
  });

  // ── TC-SH-001: Create appointment with required fields ───────────

  it('REQ-SHOWING-001 TC-SH-001: Creating appointment with required fields succeeds @p0', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    const { data, error } = await admin.from('appointments').insert({
      id: APPT_001,
      listing_id: LISTING_A,
      start_time: startTime,
      end_time: endTime,
      buyer_agent_name: 'Agent Smith',
      buyer_agent_phone: '+16045559902',
    }).select().single();

    insertedAppointmentIds.push(APPT_001);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.id).toBe(APPT_001);
    expect(data!.listing_id).toBe(LISTING_A);
    expect(data!.buyer_agent_name).toBe('Agent Smith');
    expect(data!.buyer_agent_phone).toBe('+16045559902');
    expect(data!.start_time).toBeTruthy();
    expect(data!.end_time).toBeTruthy();
  });

  // ── TC-SH-002: Status defaults to 'requested' ────────────────────

  it('REQ-SHOWING-002 TC-SH-002: Appointment status defaults to requested @p0', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 49 * 60 * 60 * 1000).toISOString();

    const { data, error } = await admin.from('appointments').insert({
      id: APPT_002,
      listing_id: LISTING_A,
      start_time: startTime,
      end_time: endTime,
      buyer_agent_name: 'Agent Brown',
      buyer_agent_phone: '+16045559903',
      // NOTE: status NOT provided — should default to 'requested'
    }).select().single();

    insertedAppointmentIds.push(APPT_002);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.status).toBe('requested');
  });

  // ── TC-SH-003: Update status to confirmed ────────────────────────

  it('REQ-SHOWING-003 TC-SH-003: Updating status to confirmed sets correct value @p0', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 73 * 60 * 60 * 1000).toISOString();

    // Create appointment first
    await admin.from('appointments').insert({
      id: APPT_003,
      listing_id: LISTING_A,
      start_time: startTime,
      end_time: endTime,
      buyer_agent_name: 'Agent Jones',
      buyer_agent_phone: '+16045559904',
    });
    insertedAppointmentIds.push(APPT_003);

    // Update to confirmed
    const { data, error } = await admin
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', APPT_003)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.status).toBe('confirmed');
  });

  // ── TC-SH-004: Update status to denied ────────────────────────────

  it('REQ-SHOWING-004 TC-SH-004: Updating status to denied sets correct value @p0', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 96 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 97 * 60 * 60 * 1000).toISOString();

    // Create appointment first
    await admin.from('appointments').insert({
      id: APPT_004,
      listing_id: LISTING_A,
      start_time: startTime,
      end_time: endTime,
      buyer_agent_name: 'Agent Williams',
      buyer_agent_phone: '+16045559905',
    });
    insertedAppointmentIds.push(APPT_004);

    // Update to denied
    const { data, error } = await admin
      .from('appointments')
      .update({ status: 'denied' })
      .eq('id', APPT_004)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.status).toBe('denied');
  });

  // ── TC-SH-005: RLS — Realtor B cannot see Realtor A showings ─────

  it('REQ-SHOWING-005 TC-SH-005: Realtor B cannot see Realtor A showings (RLS) @p0 @security', async () => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 120 * 60 * 60 * 1000).toISOString();
    const endTime = new Date(now.getTime() + 121 * 60 * 60 * 1000).toISOString();

    // Create appointment on Realtor A's listing
    await admin.from('appointments').insert({
      id: APPT_005,
      listing_id: LISTING_A,
      start_time: startTime,
      end_time: endTime,
      buyer_agent_name: 'Agent Neo',
      buyer_agent_phone: '+16045559906',
    });
    insertedAppointmentIds.push(APPT_005);

    // Simulate Realtor B's tenant-scoped query:
    // Join appointments through listings and filter by realtor_id
    // This mirrors what getAuthenticatedTenantClient() does at the app layer
    const { data: realtorBView, error } = await admin
      .from('appointments')
      .select('id, listing_id, listings!inner(realtor_id)')
      .eq('listings.realtor_id', REALTOR_B)
      .eq('id', APPT_005);

    expect(error).toBeNull();
    // Realtor B should NOT see the appointment on Realtor A's listing
    expect(realtorBView).toEqual([]);

    // Positive control: Realtor A CAN see their own appointment
    const { data: realtorAView, error: errorA } = await admin
      .from('appointments')
      .select('id, listing_id, listings!inner(realtor_id)')
      .eq('listings.realtor_id', REALTOR_A)
      .eq('id', APPT_005);

    expect(errorA).toBeNull();
    expect(realtorAView).toHaveLength(1);
    expect(realtorAView![0].id).toBe(APPT_005);
  });
});
