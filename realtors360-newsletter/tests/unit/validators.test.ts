import { describe, it, expect } from 'vitest';
import { validateDraft, EmailDraftSchema } from '../../src/orchestrator/validators.js';

describe('validateDraft', () => {
  const validReady = {
    status: 'ready' as const,
    subject: 'New listing matches your search',
    preheader: 'A 2BR in Vancouver just hit the market',
    greeting: 'Hi Alex,',
    body_paragraphs: ['A new active listing came in that matches what you saved.', 'Let me know if you want to see it.'],
    cta_label: 'View listing',
    cta_url: 'https://example.com/listings/123',
    signoff: '— Sarah',
  };

  it('accepts a clean ready draft', () => {
    const parsed = EmailDraftSchema.parse(validReady);
    expect(validateDraft(parsed)).toEqual({ ok: true });
  });

  it('rejects ready drafts missing required fields', () => {
    // subject is present and long enough to pass schema, but cta_url is missing
    const parsed = EmailDraftSchema.parse({
      status: 'ready',
      subject: 'A reasonable subject',
      body_paragraphs: ['only the body'],
    });
    const result = validateDraft(parsed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('missing required fields');
  });

  it('rejects bodies over 120 words', () => {
    const longBody = Array(130).fill('word').join(' ');
    const parsed = EmailDraftSchema.parse({ ...validReady, body_paragraphs: [longBody] });
    const result = validateDraft(parsed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('body too long');
  });

  it('rejects forbidden phrases', () => {
    const parsed = EmailDraftSchema.parse({
      ...validReady,
      body_paragraphs: ['As an AI, I can help you find a home.'],
    });
    const result = validateDraft(parsed);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('forbidden');
  });

  it('accepts insufficient_data with a reason', () => {
    const parsed = EmailDraftSchema.parse({ status: 'insufficient_data', reason: 'no contact email' });
    expect(validateDraft(parsed)).toEqual({ ok: true });
  });

  it('rejects insufficient_data without a reason', () => {
    const parsed = EmailDraftSchema.parse({ status: 'insufficient_data' });
    const result = validateDraft(parsed);
    expect(result.ok).toBe(false);
  });
});
