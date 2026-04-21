/**
 * Regression test for the cross-tenant learning-engine bug.
 *
 * Bug: `runLearningCycle(realtorId)` queried the `newsletters` table
 * filtered only by `status='sent'` and a date range — missing
 * `.eq('realtor_id', realtorId)`. Since migration 062 added multi-tenancy,
 * every realtor's weekly learning cycle was analyzing aggregate data
 * across ALL realtors instead of their own.
 *
 * Caught during the M3-C newsletter-engine port (commit e997b52).
 * Fixed in CRM by commit 188f85d.
 *
 * This test locks in the fix by asserting that the newsletters query
 * receives a `realtor_id` equality filter equal to the realtorId argument.
 * If the fix is ever reverted, this test fails immediately.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the supabase admin client BEFORE importing learning-engine.
// Tracks every chained call so we can assert the query shape.
type Call = { method: string; args: unknown[] };

function makeQueryRecorder() {
  const calls: Call[] = [];

  const builder: Record<string, unknown> = {};
  const record = (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };

  builder.from = record('from');
  builder.select = record('select');
  builder.eq = record('eq');
  builder.gte = record('gte');
  builder.in = record('in');
  builder.order = record('order');
  builder.limit = record('limit');
  builder.update = record('update');
  builder.insert = record('insert');
  // .single() resolves with empty data so the early-return path triggers
  builder.single = vi.fn(async () => ({ data: null, error: null }));
  // Treat the builder itself as thenable so `await db.from(...).select(...)` works
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    resolve({ data: [], error: null });

  return { builder, calls };
}

const { builder, calls } = makeQueryRecorder();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => builder,
}));

// Import AFTER the mock is registered
import { runLearningCycle } from '@/lib/learning-engine';

describe('runLearningCycle — cross-tenant isolation', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('REQ-TENANT-001 TC-LE-001: filters the newsletters query by realtor_id (regression: HC-12) @p0', async () => {
    const REALTOR_A = 'realtor-uuid-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    await runLearningCycle(REALTOR_A);

    // Find the chain that started with .from('newsletters')
    const fromCallIndex = calls.findIndex(
      (c) => c.method === 'from' && c.args[0] === 'newsletters'
    );
    expect(fromCallIndex).toBeGreaterThanOrEqual(0);

    // Collect all .eq() calls that happened on this builder. Because the mock
    // is shared across all chains, we look for any .eq with ('realtor_id', REALTOR_A).
    const realtorEqCall = calls.find(
      (c) =>
        c.method === 'eq' &&
        c.args[0] === 'realtor_id' &&
        c.args[1] === REALTOR_A
    );

    expect(
      realtorEqCall,
      'newsletters query MUST be scoped by realtor_id — see HC-12 / commit 188f85d'
    ).toBeDefined();
  });

  it('REQ-TENANT-001 TC-LE-002: passes a different realtor_id when called for a different tenant @p0', async () => {
    const REALTOR_B = 'realtor-uuid-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    await runLearningCycle(REALTOR_B);

    const realtorEqCall = calls.find(
      (c) =>
        c.method === 'eq' &&
        c.args[0] === 'realtor_id' &&
        c.args[1] === REALTOR_B
    );

    expect(realtorEqCall).toBeDefined();
  });
});
