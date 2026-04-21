/**
 * REQ-NEWSLETTER L1 Unit Tests: newsletter-events.ts — emitNewsletterEvent
 *
 * Tests the CRM-side event emitter that writes rows to the email_events table
 * for the newsletter service to process. Supabase client and feature gate
 * are both mocked — no real DB or network traffic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock feature gate
// ---------------------------------------------------------------------------
const mockIsFeatureEnabled = vi.fn();

vi.mock('@/lib/feature-gate', () => ({
  isFeatureEnabled: (...args: unknown[]) => mockIsFeatureEnabled(...args),
}));

import { emitNewsletterEvent, type EmitResult } from '@/lib/newsletter-events';

// ---------------------------------------------------------------------------
// Helpers to build a mock TenantClient
// ---------------------------------------------------------------------------
function makeTenantClient(overrides?: {
  insertReturn?: { data: unknown; error: unknown };
}) {
  const defaultReturn = {
    data: { id: 'evt_uuid_001' },
    error: null,
  };
  const insertReturn = overrides?.insertReturn ?? defaultReturn;

  const single = vi.fn().mockResolvedValue(insertReturn);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });

  return {
    tc: {
      raw: { from } as any,
      realtorId: 'realtor_123',
    },
    spies: { from, insert, select, single },
  };
}

const SAMPLE_INPUT = {
  event_type: 'listing_price_dropped',
  event_data: { old_price: 1000000, new_price: 950000 },
  contact_id: 'contact_456',
  listing_id: 'listing_789',
};

beforeEach(() => {
  mockIsFeatureEnabled.mockReset();
});

describe('emitNewsletterEvent', () => {
  it('REQ-NEWSLETTER-001 TC-NE-001: Returns ok:false when automations feature disabled @p1', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(false);
    const { tc } = makeTenantClient();

    const result: EmitResult = await emitNewsletterEvent(tc, SAMPLE_INPUT);

    expect(result).toEqual({ ok: false, reason: 'automations_disabled' });
    expect(mockIsFeatureEnabled).toHaveBeenCalledWith('realtor_123', 'automations');
  });

  it('REQ-NEWSLETTER-002 TC-NE-002: Inserts event with correct fields when enabled @p0', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(true);
    const { tc, spies } = makeTenantClient();

    await emitNewsletterEvent(tc, SAMPLE_INPUT);

    expect(spies.from).toHaveBeenCalledWith('email_events');
    expect(spies.insert).toHaveBeenCalledWith({
      realtor_id: 'realtor_123',
      event_type: 'listing_price_dropped',
      event_data: { old_price: 1000000, new_price: 950000 },
      contact_id: 'contact_456',
      listing_id: 'listing_789',
      affected_contact_ids: null,
      status: 'pending',
    });
    expect(spies.select).toHaveBeenCalledWith('id');
    expect(spies.single).toHaveBeenCalled();
  });

  it('REQ-NEWSLETTER-003 TC-NE-003: Returns ok:true with eventId on success @p0', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(true);
    const { tc } = makeTenantClient({
      insertReturn: { data: { id: 'evt_success_42' }, error: null },
    });

    const result: EmitResult = await emitNewsletterEvent(tc, SAMPLE_INPUT);

    expect(result).toEqual({ ok: true, eventId: 'evt_success_42' });
  });

  it('REQ-NEWSLETTER-004 TC-NE-004: Returns ok:false with reason on DB error (never throws) @p1', async () => {
    mockIsFeatureEnabled.mockResolvedValueOnce(true);
    const { tc } = makeTenantClient({
      insertReturn: {
        data: null,
        error: { message: 'violates foreign key constraint' },
      },
    });

    const result: EmitResult = await emitNewsletterEvent(tc, SAMPLE_INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('foreign key');
    }
  });
});
