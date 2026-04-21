/**
 * REQ-NEWSLETTER L1 Unit Tests: text-pipeline.ts — runTextPipeline
 *
 * Tests personalization tokens, voice rules, compliance blocking, and length
 * checks. The Supabase dedup query (step 5) is mocked to return empty data
 * so it doesn't fire. All other logic is exercised through the public API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase admin client before importing the module under test.
// The text-pipeline uses createAdminClient() for subject dedup (step 5).
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  }),
}));

import { runTextPipeline, type PipelineInput } from '@/lib/text-pipeline';

// ═══════════════════════════════════════════════
// HELPERS — minimal valid input factory
// ═══════════════════════════════════════════════

function baseInput(overrides: Partial<PipelineInput> = {}): PipelineInput {
  return {
    subject: 'New listings in your area',
    intro: 'Hi Sarah, here are some great options for you.',
    body: 'We found several properties matching your criteria in the Vancouver area.',
    ctaText: 'View Listings',
    emailType: 'listing_alert',
    contactId: 'c-001',
    contactName: 'Sarah Connor',
    contactFirstName: 'Sarah',
    contactType: 'buyer',
    contactArea: 'Vancouver',
    realtorName: 'John Smith',
    ...overrides,
  };
}

describe('runTextPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Personalization ──

  it('REQ-NEWSLETTER TC-TP-001: replaces {first_name} token @p0', async () => {
    const input = baseInput({
      intro: 'Hi {first_name}, welcome!',
    });

    const result = await runTextPipeline(input);

    expect(result.intro).toBe('Hi Sarah, welcome!');
    expect(result.blocked).toBe(false);
  });

  it('REQ-NEWSLETTER TC-TP-002: replaces {name} token @p0', async () => {
    const input = baseInput({
      body: 'Dear {name}, we have updates for you.',
    });

    const result = await runTextPipeline(input);

    expect(result.body).toBe('Dear Sarah Connor, we have updates for you.');
    expect(result.blocked).toBe(false);
  });

  it('REQ-NEWSLETTER TC-TP-003: replaces {area} token @p1', async () => {
    const input = baseInput({
      body: 'Properties in {area} are trending.',
      contactArea: 'Kitsilano',
    });

    const result = await runTextPipeline(input);

    expect(result.body).toBe('Properties in Kitsilano are trending.');
  });

  it('REQ-NEWSLETTER TC-TP-004: replaces {agent_name} token @p1', async () => {
    const input = baseInput({
      body: 'Best regards, {agent_name}',
      realtorName: 'Jane Doe',
    });

    const result = await runTextPipeline(input);

    expect(result.body).toBe('Best regards, Jane Doe');
  });

  // ── Unresolved tokens ──

  it('REQ-NEWSLETTER TC-TP-005: blocks on unresolved {{token}} @p0', async () => {
    const input = baseInput({
      body: 'Hi {{unknown_field}}, check this out.',
    });

    const result = await runTextPipeline(input);

    expect(result.blocked).toBe(true);
    expect(result.blockReason).toContain('Unresolved tokens');
    expect(result.passed).toBe(false);
  });

  // ── Compliance ──

  it('REQ-NEWSLETTER TC-TP-006: blocks on compliance violation (guaranteed return) @p0 @security', async () => {
    const input = baseInput({
      body: 'This property offers a guaranteed return on investment.',
    });

    const result = await runTextPipeline(input);

    expect(result.blocked).toBe(true);
    expect(result.blockReason).toContain('Compliance violation');
  });

  it('REQ-NEWSLETTER TC-TP-007: blocks on compliance violation (limited time offer) @p0 @security', async () => {
    const input = baseInput({
      body: 'Act now before this deal expires!',
    });

    const result = await runTextPipeline(input);

    expect(result.blocked).toBe(true);
    expect(result.blockReason).toContain('Compliance violation');
  });

  // ── Length check ──

  it('REQ-NEWSLETTER TC-TP-008: warns when body exceeds word count for email type @p1', async () => {
    // listing_alert target is 40-100 words. Generate >100 words.
    const longBody = Array(120).fill('word').join(' ');
    const input = baseInput({
      intro: 'Hi Sarah,',
      body: longBody,
      emailType: 'listing_alert',
    });

    const result = await runTextPipeline(input);

    expect(result.blocked).toBe(false);
    expect(result.warnings.some(w => w.includes('Too long'))).toBe(true);
  });

  // ── Voice rules ──

  it('REQ-NEWSLETTER TC-TP-009: removes exclamation marks from subject when voice rule set @p1', async () => {
    const input = baseInput({
      subject: 'Amazing deals in Vancouver!',
      voiceRules: ['No exclamation marks in subject lines'],
    });

    const result = await runTextPipeline(input);

    expect(result.subject).not.toContain('!');
    expect(result.corrections.some(c => c.field === 'subject' && c.rule.includes('exclamation'))).toBe(true);
  });

  // ── Name mention check ──

  it('REQ-NEWSLETTER TC-TP-010: warns when contact name not mentioned in intro @p2', async () => {
    const input = baseInput({
      intro: 'Hello there, check out these listings.',
      contactFirstName: 'Sarah',
    });

    const result = await runTextPipeline(input);

    expect(result.warnings.some(w => w.includes('Sarah') && w.includes('impersonal'))).toBe(true);
  });

  // ── Clean pass ──

  it('REQ-NEWSLETTER TC-TP-011: passes clean email with no issues @p0', async () => {
    const input = baseInput();

    const result = await runTextPipeline(input);

    expect(result.passed).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.subject).toBe('New listings in your area');
  });
});
