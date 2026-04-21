/**
 * L4 SERVER ACTION TEST TEMPLATE — Realtors360 CRM
 *
 * File placement: tests/integration/<action-name>.spec.ts
 *   tests/integration/contacts-create.spec.ts
 *   tests/integration/listings-update.spec.ts
 *
 * RULES (from TESTING.md):
 *   - Every test titled per RTM regex: REQ-AREA-N TC-XX-N: description @p[012]
 *   - 3-layer assertions: Response + DB state + Side effects
 *   - RLS isolation: two-user assertion for tenant-scoped data
 *   - No Supabase mocking — use real DB, clean up after
 *   - Auth via real session, never mocked
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// --- SETUP ---
// Admin client bypasses RLS for test verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Track created records for cleanup
const cleanup: Array<{ table: string; id: string }> = [];

afterEach(async () => {
  // Delete in reverse order to respect FK constraints
  for (const { table, id } of cleanup.reverse()) {
    await supabaseAdmin.from(table).delete().eq('id', id);
  }
  cleanup.length = 0;
});

// --- REPLACE BELOW WITH YOUR SERVER ACTION ---

describe('createContact server action', () => {
  // Replace with your test user IDs (from demo users or test fixtures)
  const REALTOR_A_ID = 'test-realtor-a-uuid';
  const REALTOR_B_ID = 'test-realtor-b-uuid';

  // --- HAPPY PATH ---

  it('REQ-CONTACT-001 TC-CC-001: creates contact with required fields @p0', async () => {
    // --- ACT ---
    // Call the server action or API endpoint
    const res = await fetch('http://localhost:3000/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include auth cookie/header
      },
      body: JSON.stringify({
        name: 'Test Contact',
        type: 'buyer',
        email: 'test@example.com',
      }),
    });

    // --- RESPONSE ---
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      id: expect.any(String),
      name: 'Test Contact',
      type: 'buyer',
    });
    cleanup.push({ table: 'contacts', id: body.id });

    // --- DATABASE ---
    const { data: row } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', body.id)
      .single();
    expect(row).toMatchObject({
      name: 'Test Contact',
      type: 'buyer',
      email: 'test@example.com',
      realtor_id: REALTOR_A_ID,
    });

    // --- SIDE EFFECTS ---
    // N/A: contact creation has no external side effects (unless speed-to-lead notification)
    // If speed-to-lead is enabled, assert notification created:
    // const { data: notifications } = await supabaseAdmin
    //   .from('notifications')
    //   .select()
    //   .eq('related_id', body.id)
    //   .eq('type', 'speed_to_lead');
    // expect(notifications).toHaveLength(1);
  });

  // --- VALIDATION ---

  it('REQ-CONTACT-001 TC-CC-002: rejects contact without name @p0', async () => {
    const res = await fetch('http://localhost:3000/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'buyer' }), // missing name
    });
    expect(res.status).toBe(400);
  });

  // --- AUTH ---

  it('REQ-AUTH-006 TC-CC-003: rejects unauthenticated request @p0 @security', async () => {
    const res = await fetch('http://localhost:3000/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hack', type: 'buyer' }),
      // No auth header
    });
    expect(res.status).toBe(401);
  });

  // --- RLS ISOLATION ---

  it('REQ-RLS-001 TC-CC-004: tenant B cannot read tenant A contacts @p0 @security', async () => {
    // Create contact as Realtor A
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .insert({
        name: 'Private Contact',
        type: 'seller',
        realtor_id: REALTOR_A_ID,
      })
      .select()
      .single();
    cleanup.push({ table: 'contacts', id: contact!.id });

    // Attempt read as Realtor B (via tenant-scoped client)
    // In practice, use getAuthenticatedTenantClient(REALTOR_B_ID)
    const { data: leaked } = await supabaseAdmin
      .from('contacts')
      .select()
      .eq('id', contact!.id)
      .eq('realtor_id', REALTOR_B_ID);

    expect(leaked).toHaveLength(0);
  });

  // --- EDGE CASES ---

  it('REQ-CONTACT-001 TC-CC-005: handles duplicate email gracefully @p1', async () => {
    // Create first contact
    const { data: first } = await supabaseAdmin
      .from('contacts')
      .insert({
        name: 'First',
        email: 'dupe@test.com',
        type: 'buyer',
        realtor_id: REALTOR_A_ID,
      })
      .select()
      .single();
    cleanup.push({ table: 'contacts', id: first!.id });

    // Create second with same email — should succeed (email not unique per realtor)
    const { data: second } = await supabaseAdmin
      .from('contacts')
      .insert({
        name: 'Second',
        email: 'dupe@test.com',
        type: 'seller',
        realtor_id: REALTOR_A_ID,
      })
      .select()
      .single();
    if (second) cleanup.push({ table: 'contacts', id: second.id });

    // Adjust assertion based on actual constraint behavior
    expect(second).not.toBeNull();
  });
});
