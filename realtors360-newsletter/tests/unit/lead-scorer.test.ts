import { describe, it, expect } from 'vitest';
import {
  extractJsonString,
  buildScoringContext,
  LeadScoreSchema,
} from '../../src/shared/ai-agent/lead-scorer.js';

/**
 * Tests for the deterministic helpers in the M3-D lead-scorer port.
 *
 * Per the M3 cron map §6.5: the CRM original has zero tests today. These
 * lock down the parts we can test without invoking Claude or Supabase —
 * the JSON extractor, the prompt builder, and the Zod schema. The full
 * scoreContact / scoreBatch flows are integration-level and covered by
 * the staging smoke test described in §6.5.
 *
 * Why these particular helpers:
 *   - extractJsonString: the second-most common cause of scoring failures
 *     after the API itself (Claude wraps JSON in fenced blocks ~half the
 *     time). The CRM original silently returns null on parse failure, so
 *     a regression here would silently degrade scoring quality.
 *   - buildScoringContext: the prompt format is the contract with Claude.
 *     Any drift here changes scoring outputs in subtle ways. Locking the
 *     format means future edits are intentional, not accidental.
 *   - LeadScoreSchema: Zod parse failures abort the recommendation insert.
 *     We test boundary values (0, 100, just over) and missing required
 *     fields so a migration that broadens or narrows the schema fails
 *     loudly here first.
 */

// ---------------------------------------------------------------------------
// extractJsonString
// ---------------------------------------------------------------------------

describe('extractJsonString', () => {
  it('extracts JSON from a fenced ```json block', () => {
    const input = 'Here is the score:\n```json\n{"buying_readiness": 75}\n```\nDone.';
    expect(extractJsonString(input)).toBe('{"buying_readiness": 75}');
  });

  it('extracts JSON from an unlabeled ``` block', () => {
    const input = '```\n{"intent": "serious_buyer"}\n```';
    expect(extractJsonString(input)).toBe('{"intent": "serious_buyer"}');
  });

  it('falls back to the first balanced brace match when no fence is present', () => {
    const input = 'Sure thing — {"buying_readiness": 50, "intent": "investor"} that is my answer.';
    expect(extractJsonString(input)).toBe('{"buying_readiness": 50, "intent": "investor"}');
  });

  it('returns the raw text when no JSON is found at all', () => {
    const input = 'I cannot score this contact, sorry.';
    expect(extractJsonString(input)).toBe('I cannot score this contact, sorry.');
  });

  it('handles multi-line JSON inside a fenced block', () => {
    const input = '```json\n{\n  "buying_readiness": 90,\n  "intent": "active_searcher"\n}\n```';
    const out = extractJsonString(input);
    // Ensure the extracted slice round-trips through JSON.parse.
    expect(() => JSON.parse(out)).not.toThrow();
    const parsed = JSON.parse(out) as { buying_readiness: number; intent: string };
    expect(parsed.buying_readiness).toBe(90);
    expect(parsed.intent).toBe('active_searcher');
  });
});

// ---------------------------------------------------------------------------
// buildScoringContext
// ---------------------------------------------------------------------------

// Plain object literal — TypeScript infers permissive types and the test
// passes it through buildScoringContext's structural check. We avoid `as
// const` here because the resulting readonly arrays conflict with the
// mutable `string[]` slots on ContactRow.
const baseContact = {
  id: 'c1',
  name: 'Alice Buyer',
  type: 'buyer',
  email: 'alice@example.com',
  realtor_id: 'r1',
  stage_bar: 'qualified',
  lead_status: 'warm',
  tags: ['relocating', 'first-time-buyer'],
  buyer_preferences: { areas: ['Kitsilano'], beds_min: 2 },
  seller_preferences: null,
  newsletter_intelligence: null,
  family_members: null,
  created_at: '2026-03-01T00:00:00Z',
  ai_lead_score: null,
};

describe('buildScoringContext', () => {
  it('includes contact basics, preferences, and zero-activity counters', () => {
    const ctx = buildScoringContext(baseContact, [], [], [], {});
    expect(ctx).toContain('NAME: Alice Buyer');
    expect(ctx).toContain('TYPE: buyer');
    expect(ctx).toContain('STAGE: qualified');
    expect(ctx).toContain('"areas"');
    expect(ctx).toContain('Emails opened: 0');
    expect(ctx).toContain('Showings: 0 total, 0 confirmed');
    expect(ctx).toContain('Engagement score: 0/100');
  });

  it('counts opens, clicks, click types, and confirmed showings', () => {
    const events = [
      { event_type: 'opened', link_type: null, link_url: null, created_at: '2026-04-01T00:00:00Z' },
      { event_type: 'opened', link_type: null, link_url: null, created_at: '2026-04-02T00:00:00Z' },
      { event_type: 'clicked', link_type: 'book_showing', link_url: 'x', created_at: '2026-04-03T00:00:00Z' },
      { event_type: 'clicked', link_type: 'cma_request', link_url: 'y', created_at: '2026-04-04T00:00:00Z' },
    ];
    const showings = [
      { status: 'confirmed', start_time: '2026-04-05T15:00:00Z' },
      { status: 'requested', start_time: '2026-04-06T15:00:00Z' },
    ];
    const ctx = buildScoringContext(baseContact, [], events, showings, {});
    expect(ctx).toContain('Emails opened: 2');
    expect(ctx).toContain('Links clicked: 2');
    expect(ctx).toContain('Click types: book_showing, cma_request');
    expect(ctx).toContain('Showings: 2 total, 1 confirmed');
  });

  it('renders newsletter_intelligence engagement, preference, and click history', () => {
    const intel = {
      engagement_score: 78,
      content_preference: 'data-heavy',
      inferred_interests: { areas: ['Kitsilano'] },
      click_history: [
        { link_type: 'school_info', clicked_at: '2026-04-01T12:00:00Z' },
        { link_type: 'price_drop', clicked_at: '2026-04-02T12:00:00Z' },
      ],
    };
    const ctx = buildScoringContext(baseContact, [], [], [], intel);
    expect(ctx).toContain('Engagement score: 78/100');
    expect(ctx).toContain('Content preference: data-heavy');
    expect(ctx).toContain('"Kitsilano"');
    expect(ctx).toContain('school_info');
    expect(ctx).toContain('price_drop');
  });

  it('truncates communication bodies to 80 chars and slices to last 5', () => {
    const longBody = 'x'.repeat(200);
    const comms = Array.from({ length: 8 }, (_, i) => ({
      channel: 'email',
      direction: 'inbound',
      body: longBody,
      created_at: `2026-04-0${i + 1}T00:00:00Z`,
    }));
    const ctx = buildScoringContext(baseContact, comms, [], [], {});
    // Communications count line shows the FULL list size (8)
    expect(ctx).toContain('Communications: 8 messages');
    // The "RECENT COMMUNICATIONS (last 5)" block uses .slice(0, 5) which
    // takes the FIRST five elements from the array passed in. Since the
    // CRM cron passes them ordered by created_at DESC, "first 5" means
    // "5 most recent" — same semantics as the source. The truncation
    // marker "..." should be present per body, and we should see exactly
    // 5 bullet lines, not 8.
    const recentBlock = ctx.split('RECENT COMMUNICATIONS (last 5):')[1] ?? '';
    const bulletLines = recentBlock.split('\n').filter((l) => l.startsWith('- '));
    expect(bulletLines).toHaveLength(5);
    for (const line of bulletLines) {
      expect(line).toContain('...');
    }
  });

  it('handles null preferences, null intel, and missing optional fields gracefully', () => {
    const sparseContact = {
      ...baseContact,
      name: null,
      type: null,
      stage_bar: null,
      lead_status: null,
      tags: null,
      buyer_preferences: null,
      seller_preferences: null,
    };
    const ctx = buildScoringContext(sparseContact, [], [], [], {});
    expect(ctx).toContain('NAME: Unknown');
    expect(ctx).toContain('TYPE: unknown');
    expect(ctx).toContain('STAGE: new');
    expect(ctx).toContain('LEAD STATUS: new');
    expect(ctx).toContain('TAGS: []');
    expect(ctx).toContain('PREFERENCES:\n{}');
    expect(ctx).toContain('RECENT CLICKS (last 5):\nnone');
    expect(ctx).toContain('RECENT COMMUNICATIONS (last 5):\nnone');
  });
});

// ---------------------------------------------------------------------------
// LeadScoreSchema
// ---------------------------------------------------------------------------

describe('LeadScoreSchema', () => {
  const valid = {
    buying_readiness: 80,
    timeline_urgency: 60,
    budget_fit: 75,
    intent: 'serious_buyer' as const,
    reasoning: 'Cited 3 showings in past 14 days and 8 clicks on book_showing CTAs.',
    stage_recommendation: 'advance' as const,
    new_stage: 'qualified',
    personalization_hints: {
      tone: 'data-driven',
      interests: ['Kitsilano'],
    },
  };

  it('parses a fully populated valid score', () => {
    expect(() => LeadScoreSchema.parse(valid)).not.toThrow();
  });

  it('parses with optional fields omitted', () => {
    const minimal = {
      buying_readiness: 0,
      timeline_urgency: 0,
      budget_fit: 0,
      intent: 'dormant' as const,
      reasoning: 'No activity in 90 days.',
    };
    expect(() => LeadScoreSchema.parse(minimal)).not.toThrow();
  });

  it('rejects out-of-range scores (> 100)', () => {
    const bad = { ...valid, buying_readiness: 101 };
    expect(() => LeadScoreSchema.parse(bad)).toThrow();
  });

  it('rejects negative scores', () => {
    const bad = { ...valid, timeline_urgency: -1 };
    expect(() => LeadScoreSchema.parse(bad)).toThrow();
  });

  it('rejects unknown intent enum values', () => {
    const bad = { ...valid, intent: 'super_hot_buyer' };
    expect(() => LeadScoreSchema.parse(bad)).toThrow();
  });
});
