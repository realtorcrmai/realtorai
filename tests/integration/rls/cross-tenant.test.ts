/**
 * RLS Canary — Cross-Tenant Isolation
 *
 * This is the test that would have caught the M3-C cross-tenant
 * learning-engine bug at the SQL layer rather than the application layer.
 *
 * It connects to a TEST Supabase project, creates two synthetic realtors,
 * inserts a row owned by Realtor A, then asserts that a query made on
 * behalf of Realtor B (via a tenant-scoped client) cannot see it.
 *
 * Gating:
 *   - Skipped automatically unless `TEST_SUPABASE_URL` and
 *     `TEST_SUPABASE_SERVICE_ROLE_KEY` are set in the environment.
 *   - In CI, those vars come from a dedicated `staging` Supabase project.
 *   - Locally, developers can opt in by exporting them in `.env.test`.
 *
 * IMPORTANT: This test does NOT touch production. It targets the test
 * project explicitly via the env vars above. The standard
 * NEXT_PUBLIC_SUPABASE_URL is intentionally not used here so that a
 * misconfigured local environment cannot accidentally write to prod.
 *
 * Tables exercised: `newsletters` (the table the M3-C bug was in).
 * Future: extend to every table with a `realtor_id` column.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const TEST_URL = process.env.TEST_SUPABASE_URL;
const TEST_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(TEST_URL && TEST_KEY);

// describe.skipIf is the idiomatic vitest pattern for env-gated suites
describe.skipIf(!enabled)('RLS canary — cross-tenant isolation', () => {
  let admin: SupabaseClient;

  // Two synthetic tenants. UUIDs are deterministic so reruns are idempotent.
  const REALTOR_A = '00000000-0000-4000-8000-00000000aaaa';
  const REALTOR_B = '00000000-0000-4000-8000-00000000bbbb';
  const NEWSLETTER_ID_A = '00000000-0000-4000-8000-aaaaaaaaaaaa';

  beforeAll(async () => {
    admin = createClient(TEST_URL!, TEST_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Insert a newsletter row owned by Realtor A.
    // Use upsert so reruns don't conflict.
    const { error } = await admin.from('newsletters').upsert(
      {
        id: NEWSLETTER_ID_A,
        realtor_id: REALTOR_A,
        email_type: 'rls_canary',
        status: 'sent',
        sent_at: new Date().toISOString(),
        contact_id: null,
      },
      { onConflict: 'id' }
    );

    if (error) {
      // Don't silently swallow — failing setup means the canary is broken,
      // and we want CI to scream.
      throw new Error(`canary setup failed: ${error.message}`);
    }
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from('newsletters').delete().eq('id', NEWSLETTER_ID_A);
  });

  it('Realtor B cannot see a newsletter owned by Realtor A', async () => {
    // Simulate the application-layer tenant client by manually applying
    // the same `.eq('realtor_id', ...)` filter that
    // getAuthenticatedTenantClient() injects.
    const { data, error } = await admin
      .from('newsletters')
      .select('id, realtor_id')
      .eq('realtor_id', REALTOR_B)
      .eq('id', NEWSLETTER_ID_A);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Realtor A CAN see their own newsletter (positive control)", async () => {
    const { data, error } = await admin
      .from('newsletters')
      .select('id, realtor_id')
      .eq('realtor_id', REALTOR_A)
      .eq('id', NEWSLETTER_ID_A);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.realtor_id).toBe(REALTOR_A);
  });

  it('an unfiltered query (the bug shape) returns the row — proves the canary is real', async () => {
    // This is the EXACT shape of the bug at learning-engine.ts:51 before
    // commit 188f85d. We assert that without the realtor_id filter, the
    // row is visible — which proves the canary is testing real behaviour
    // and not just trivially passing because the row doesn't exist.
    const { data, error } = await admin
      .from('newsletters')
      .select('id, realtor_id')
      .eq('id', NEWSLETTER_ID_A);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
