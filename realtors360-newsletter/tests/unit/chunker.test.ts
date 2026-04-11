import { describe, it, expect } from 'vitest';
import {
  splitText,
  stripHtml,
  buildContactDoc,
  buildListingDoc,
  buildNewsletterDoc,
  chunkRecord,
  resolveContentType,
} from '../../src/shared/rag/chunker.js';

/**
 * Behavioural tests for the RAG chunker port. The CRM original has zero
 * tests today (M3 cron map §6.5), so this is the new baseline. We test:
 *   - HTML stripping
 *   - splitText boundary behaviour
 *   - composite document builders
 *   - chunkRecord per source table
 *   - resolveContentType for knowledge_articles override
 */

describe('stripHtml', () => {
  it('removes tags and decodes entities', () => {
    const html = '<p>Hello&nbsp;<b>world</b>&amp;more</p>';
    expect(stripHtml(html)).toBe('Hello world &more');
  });

  it('drops style and script content', () => {
    const html = '<style>body{}</style><script>alert(1)</script><p>visible</p>';
    expect(stripHtml(html)).toBe('visible');
  });

  it('collapses whitespace', () => {
    expect(stripHtml('<p>a    b\n\n  c</p>')).toBe('a b c');
  });
});

describe('splitText', () => {
  it('returns single chunk when text fits', () => {
    const text = 'short text';
    expect(splitText(text, 100, 0)).toEqual([text]);
  });

  it('splits on paragraph boundaries when over limit', () => {
    // Each paragraph is ~30 tokens (120 chars). maxTokens=40 → 1 paragraph per chunk
    const para = 'word '.repeat(30).trim();
    const text = `${para}\n\n${para}\n\n${para}`;
    const chunks = splitText(text, 40, 0);
    expect(chunks.length).toBe(3);
    for (const c of chunks) expect(c).toBe(para);
  });

  it('applies overlap between chunks', () => {
    const para = 'aaaa '.repeat(30).trim();
    const text = `${para}\n\n${para}`;
    const chunks = splitText(text, 40, 5);
    expect(chunks.length).toBe(2);
    // Second chunk should be longer than first because it has overlap prepended
    expect(chunks[1].length).toBeGreaterThan(chunks[0].length);
  });
});

describe('buildContactDoc', () => {
  it('serialises name + type + stage', () => {
    const doc = buildContactDoc({
      id: 'c1',
      name: 'Alex Chen',
      type: 'buyer',
      stage_bar: 'qualified',
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Alex Chen (buyer, qualified)');
  });

  it('includes buyer preferences when present', () => {
    const doc = buildContactDoc({
      id: 'c1',
      name: 'Alex',
      type: 'buyer',
      buyer_preferences: {
        price_range_min: 500_000,
        price_range_max: 900_000,
        areas: ['Vancouver', 'Burnaby'],
        bedrooms: 3,
      },
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Budget: $500000-900000');
    expect(doc).toContain('Areas: Vancouver, Burnaby');
    expect(doc).toContain('Bedrooms: 3+');
  });
});

describe('buildListingDoc', () => {
  it('formats address + price + status', () => {
    const doc = buildListingDoc({
      id: 'l1',
      address: '123 Main St',
      list_price: 850_000,
      status: 'active',
      property_type: 'condo',
      created_at: '2026-01-01',
    });
    expect(doc).toContain('123 Main St');
    expect(doc).toContain('$850000');
    expect(doc).toContain('(active)');
    expect(doc).toContain('Type: condo');
  });
});

describe('buildNewsletterDoc', () => {
  it('strips html and prepends subject', () => {
    const doc = buildNewsletterDoc({
      subject: 'Hello',
      html_body: '<p>Body <b>text</b></p>',
    });
    expect(doc).toBe('Subject: Hello\n\nBody text');
  });
});

describe('chunkRecord', () => {
  it('chunks a communications row', () => {
    const chunks = chunkRecord('communications', {
      body: 'Hello there, how is it going?',
      contact_id: 'c1',
      channel: 'sms',
      direction: 'outbound',
      created_at: '2026-04-01',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('Hello there');
    expect(chunks[0].metadata.contact_id).toBe('c1');
    expect(chunks[0].metadata.channel).toBe('sms');
  });

  it('returns empty array for empty body', () => {
    expect(chunkRecord('communications', { body: '   ' })).toEqual([]);
  });

  it('throws for unknown source table', () => {
    // @ts-expect-error -- testing runtime behaviour
    expect(() => chunkRecord('not_a_table', {})).toThrow(/Unknown source table/);
  });
});

describe('resolveContentType', () => {
  it('uses default mapping for most tables', () => {
    expect(resolveContentType('communications', {})).toBe('message');
    expect(resolveContentType('newsletters', {})).toBe('email');
    expect(resolveContentType('listings', {})).toBe('listing');
  });

  it('overrides for knowledge_articles based on category', () => {
    expect(resolveContentType('knowledge_articles', { category: 'playbook' })).toBe('playbook');
    expect(resolveContentType('knowledge_articles', { category: 'script' })).toBe('script');
  });

  it('falls back to faq when knowledge category is unknown', () => {
    expect(resolveContentType('knowledge_articles', { category: 'random' })).toBe('faq');
    expect(resolveContentType('knowledge_articles', {})).toBe('faq');
  });
});
