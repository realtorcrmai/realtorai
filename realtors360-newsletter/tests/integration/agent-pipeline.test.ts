import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── In-memory data store ──────────────────────────────────────────────
const REALTOR_ID = '7de22757-dd3a-4a4f-a088-c422746e88d4';
const CONTACT_ID = '0922c152-09a4-4430-93c2-bba05ebda674';
const EVENT_ID = 'eeeeeeee-0000-0000-0000-000000000001';

type Row = Record<string, unknown>;

const tables: Record<string, Row[]> = {
  email_events: [],
};

function resetTables(): void {
  tables.email_events = [
    {
      id: EVENT_ID,
      realtor_id: REALTOR_ID,
      event_type: 'listing_sold',
      event_data: { listing_id: 'lst-001', sale_price: 850_000 },
      affected_contact_ids: [CONTACT_ID],
      contact_id: CONTACT_ID,
      listing_id: 'lst-001',
      status: 'pending',
      retry_count: 0,
    },
  ];
}

// ── Mock Supabase client ──────────────────────────────────────────────
// Minimal chainable query builder that reads/writes the in-memory tables.
function createChain(table: string) {
  const state = {
    filters: [] as Array<(r: Row) => boolean>,
    insertPayload: null as Row | null,
    updatePayload: null as Row | null,
    selectCols: null as string | null,
  };

  function applyFilters(): Row[] {
    const rows = tables[table] ?? [];
    let result = [...rows];
    for (const f of state.filters) result = result.filter(f);
    return result;
  }

  function execute(isSingle: boolean): { data: Row | Row[] | null; error: null; count?: number } {
    if (state.insertPayload) {
      const row = { ...state.insertPayload, id: state.insertPayload.id ?? crypto.randomUUID() };
      if (!tables[table]) tables[table] = [];
      tables[table].push(row);
      return isSingle ? { data: row, error: null } : { data: [row], error: null };
    }

    if (state.updatePayload) {
      const matched = applyFilters();
      for (const m of matched) {
        Object.assign(m, state.updatePayload);
      }
      return { data: matched, error: null };
    }

    const matched = applyFilters();
    return isSingle ? { data: matched[0] ?? null, error: null } : { data: matched, error: null };
  }

  const chain = {
    select(_cols?: string, _opts?: Record<string, unknown>) {
      state.selectCols = (_cols as string) ?? '*';
      return chain;
    },
    insert(payload: Row) {
      state.insertPayload = payload;
      return chain;
    },
    update(payload: Row) {
      state.updatePayload = payload;
      return chain;
    },
    eq(col: string, val: unknown) {
      state.filters.push((r) => r[col] === val);
      return chain;
    },
    gte(_col: string, _val: unknown) {
      return chain;
    },
    order(_col: string, _opts?: Record<string, unknown>) {
      return chain;
    },
    limit(_n: number) {
      return chain;
    },
    single() {
      return execute(true);
    },
    maybeSingle() {
      return execute(true);
    },
    then(
      resolve?: ((v: unknown) => unknown) | null,
      reject?: ((e: unknown) => unknown) | null,
    ) {
      return Promise.resolve(execute(false)).then(resolve, reject);
    },
  };

  return chain;
}

const mockSupabase = { from: (table: string) => createChain(table) };

// ── Mocks (all inlined to avoid hoisting issues) ────────────────────

vi.mock('../../src/lib/supabase.js', () => ({
  supabase: { from: (table: string) => createChain(table) },
}));
vi.mock('../../src/lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));
vi.mock('../../src/pipelines/saved-search-match.js', () => ({
  runSavedSearchMatch: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../../src/pipelines/listing-price-drop.js', () => ({
  runListingPriceDrop: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../../src/pipelines/listing-sold.js', () => ({
  runListingSold: vi.fn().mockResolvedValue({ ok: true, newsletter_id: 'nl-001', resend_id: 'resend-001' }),
}));
vi.mock('../../src/pipelines/showing-confirmed.js', () => ({
  runShowingConfirmed: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('../../src/pipelines/contact-birthday.js', () => ({
  runContactBirthday: vi.fn().mockResolvedValue({ ok: true }),
}));

// ── Import modules under test ────────────────────────────────────────
import { processEvent } from '../../src/workers/process-event.js';
import { runListingSold } from '../../src/pipelines/listing-sold.js';
const mockListingSold = vi.mocked(runListingSold);

// ── Tests ─────────────────────────────────────────────────────────────
describe('agent pipeline integration', () => {
  beforeEach(() => {
    resetTables();
    mockListingSold.mockClear();
  });

  it('processes a pending event end-to-end: routes to pipeline, updates status', async () => {
    await processEvent(EVENT_ID);

    // 1. The correct pipeline should have been called
    expect(mockListingSold).toHaveBeenCalledTimes(1);
    const pipelineArg = mockListingSold.mock.calls[0][0];
    expect(pipelineArg.id).toBe(EVENT_ID);
    expect(pipelineArg.event_type).toBe('listing_sold');

    // 2. Event status should be updated to 'processed'
    const event = tables.email_events.find((r) => r.id === EVENT_ID);
    expect(event).toBeDefined();
    expect(event!.status).toBe('processed');
    expect(event!.processed_at).toBeDefined();
  });

  it('marks event as failed when pipeline returns ok: false', async () => {
    mockListingSold.mockResolvedValueOnce({ ok: false, reason: 'consent:unsubscribed' });

    await processEvent(EVENT_ID);

    const event = tables.email_events.find((r) => r.id === EVENT_ID);
    expect(event!.status).toBe('failed');
    expect(event!.error_message).toBe('consent:unsubscribed');
  });

  it('skips events that are not in pending status', async () => {
    tables.email_events[0].status = 'processed';

    await processEvent(EVENT_ID);

    expect(mockListingSold).not.toHaveBeenCalled();
  });

  it('marks unknown event types as ignored', async () => {
    tables.email_events[0].event_type = 'unknown_type';

    await processEvent(EVENT_ID);

    const event = tables.email_events.find((r) => r.id === EVENT_ID);
    expect(event!.status).toBe('ignored');
    expect(mockListingSold).not.toHaveBeenCalled();
  });

  it('handles missing event gracefully', async () => {
    await processEvent('nonexistent-id');

    // Should not throw, not call any pipeline
    expect(mockListingSold).not.toHaveBeenCalled();
  });
});
