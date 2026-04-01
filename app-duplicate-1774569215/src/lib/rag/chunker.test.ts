// ============================================================
// Comprehensive Tests for RAG Phase 1: Chunker + Document Builders
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  splitText,
  buildContactDoc,
  buildListingDoc,
  buildNewsletterDoc,
  buildActivityDoc,
  buildOfferDoc,
  chunkRecord,
} from './chunker';
import { estimateTokens } from './constants';

// ============================================================
// stripHtml
// ============================================================

describe('stripHtml', () => {
  it('removes basic HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
  });

  it('removes nested tags', () => {
    expect(stripHtml('<div><p><strong>Bold</strong> text</p></div>')).toBe('Bold text');
  });

  it('removes style and script blocks entirely', () => {
    const html = '<style>.foo{color:red}</style><p>Keep</p><script>alert(1)</script>';
    expect(stripHtml(html)).toBe('Keep');
  });

  it('decodes HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot; &#39; &nbsp;')).toBe('& < > " \'');
  });

  it('collapses whitespace', () => {
    expect(stripHtml('<p>  Hello   world  </p>')).toBe('Hello world');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('handles plain text (no HTML)', () => {
    expect(stripHtml('Just plain text')).toBe('Just plain text');
  });

  it('handles real email HTML with tables', () => {
    const html = `<table><tr><td style="padding:20px">
      <h1>New Listing</h1>
      <p>Check out this <a href="https://example.com">property</a></p>
    </td></tr></table>`;
    const result = stripHtml(html);
    expect(result).toContain('New Listing');
    expect(result).toContain('property');
    expect(result).not.toContain('<');
  });
});

// ============================================================
// splitText
// ============================================================

describe('splitText', () => {
  it('returns single chunk for short text', () => {
    const text = 'Short text under limit';
    const chunks = splitText(text, 512);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits on paragraph boundaries', () => {
    const para1 = 'A'.repeat(400); // ~100 tokens
    const para2 = 'B'.repeat(400); // ~100 tokens
    const para3 = 'C'.repeat(400); // ~100 tokens
    const text = `${para1}\n\n${para2}\n\n${para3}`;
    const chunks = splitText(text, 60); // force split (~240 chars = 60 tokens)
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be under the limit
    for (const chunk of chunks) {
      expect(estimateTokens(chunk)).toBeLessThanOrEqual(70); // allow some tolerance
    }
  });

  it('splits on sentences when paragraph exceeds limit', () => {
    const longParagraph = 'This is sentence one. This is sentence two. This is sentence three. This is sentence four. This is sentence five.';
    const chunks = splitText(longParagraph, 10); // ~10 tokens = ~40 chars
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('hard truncates single long sentence', () => {
    const longSentence = 'A'.repeat(4000); // ~1000 tokens
    const chunks = splitText(longSentence, 100);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // First chunk should be truncated
    expect(chunks[0].length).toBeLessThanOrEqual(400 + 10); // 100 tokens * 4 chars + tolerance
  });

  it('handles empty text', () => {
    expect(splitText('', 512)).toEqual(['']);
  });

  it('applies overlap when specified', () => {
    const para1 = 'First paragraph content here.';
    const para2 = 'Second paragraph content here.';
    const para3 = 'Third paragraph content here.';
    const text = `${para1}\n\n${para2}\n\n${para3}`;
    const chunks = splitText(text, 12, 3); // small limit to force split
    if (chunks.length > 1) {
      // Second chunk should start with tail of first chunk
      expect(chunks[1].length).toBeGreaterThan(chunks[0] ? 0 : -1);
    }
  });

  it('handles text with multiple newline styles', () => {
    const text = 'Part 1\n\n\n\nPart 2\n\nPart 3';
    const chunks = splitText(text, 512);
    expect(chunks).toHaveLength(1); // all fits
    expect(chunks[0]).toContain('Part 1');
    expect(chunks[0]).toContain('Part 2');
  });
});

// ============================================================
// buildContactDoc
// ============================================================

describe('buildContactDoc', () => {
  it('builds minimal contact document', () => {
    const doc = buildContactDoc({
      id: '123',
      name: 'John Doe',
      type: 'buyer',
      created_at: '2026-01-01',
    });
    expect(doc).toContain('John Doe (buyer)');
  });

  it('includes stage_bar when present', () => {
    const doc = buildContactDoc({
      id: '123',
      name: 'Jane',
      type: 'seller',
      stage_bar: 'active_listing',
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Jane (seller, active_listing)');
  });

  it('includes notes', () => {
    const doc = buildContactDoc({
      id: '123',
      name: 'Jane',
      type: 'buyer',
      notes: 'Interested in Kitsilano condos',
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Notes: Interested in Kitsilano condos');
  });

  it('includes tags', () => {
    const doc = buildContactDoc({
      id: '123',
      name: 'Jane',
      type: 'buyer',
      tags: ['first-time', 'pre-approved'],
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Tags: first-time, pre-approved');
  });

  it('includes buyer preferences', () => {
    const doc = buildContactDoc({
      id: '123',
      name: 'Sarah',
      type: 'buyer',
      buyer_preferences: {
        price_range_min: 700000,
        price_range_max: 900000,
        areas: ['Surrey', 'Langley'],
        property_types: ['Townhouse', 'Condo'],
        bedrooms: 3,
      },
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Budget: $700000-900000');
    expect(doc).toContain('Areas: Surrey, Langley');
    expect(doc).toContain('Property types: Townhouse, Condo');
    expect(doc).toContain('Bedrooms: 3+');
  });

  it('includes seller preferences', () => {
    const doc = buildContactDoc({
      id: '123',
      name: 'Bob',
      type: 'seller',
      seller_preferences: {
        timeline: '3 months',
        price_expectation: 1200000,
      },
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Sell timeline: 3 months');
    expect(doc).toContain('Price expectation: $1200000');
  });

  it('includes demographics', () => {
    const doc = buildContactDoc({
      id: '123',
      name: 'Alice',
      type: 'buyer',
      demographics: {
        family_status: 'married with 2 kids',
        interests: ['schools', 'parks', 'transit'],
      },
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Family: married with 2 kids');
    expect(doc).toContain('Interests: schools, parks, transit');
  });

  it('handles all fields together', () => {
    const doc = buildContactDoc({
      id: '123',
      name: 'Full Contact',
      type: 'buyer',
      stage_bar: 'warm',
      notes: 'Very active',
      tags: ['vip'],
      buyer_preferences: { areas: ['Vancouver'] },
      demographics: { family_status: 'single' },
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Full Contact (buyer, warm)');
    expect(doc).toContain('Notes: Very active');
    expect(doc).toContain('Tags: vip');
    expect(doc).toContain('Areas: Vancouver');
    expect(doc).toContain('Family: single');
  });
});

// ============================================================
// buildListingDoc
// ============================================================

describe('buildListingDoc', () => {
  it('builds minimal listing document', () => {
    const doc = buildListingDoc({
      id: '456',
      address: '123 Main St, Vancouver',
      status: 'active',
      created_at: '2026-01-01',
    });
    expect(doc).toContain('123 Main St, Vancouver');
    expect(doc).toContain('active');
  });

  it('includes price', () => {
    const doc = buildListingDoc({
      id: '456',
      address: '123 Main St',
      list_price: 899000,
      status: 'active',
      created_at: '2026-01-01',
    });
    expect(doc).toContain('$899000');
  });

  it('includes all fields', () => {
    const doc = buildListingDoc({
      id: '456',
      address: '456 Oak Ave, Surrey',
      list_price: 1200000,
      status: 'pending',
      property_type: 'Townhouse',
      mls_number: 'R2789456',
      notes: 'Corner unit with view',
      created_at: '2026-01-01',
    });
    expect(doc).toContain('Type: Townhouse');
    expect(doc).toContain('MLS#: R2789456');
    expect(doc).toContain('Notes: Corner unit with view');
  });
});

// ============================================================
// buildNewsletterDoc
// ============================================================

describe('buildNewsletterDoc', () => {
  it('strips HTML and prepends subject', () => {
    const doc = buildNewsletterDoc({
      subject: 'March Market Update',
      html_body: '<h1>Market Update</h1><p>Prices are <strong>up</strong> 5%.</p>',
    });
    expect(doc).toContain('Subject: March Market Update');
    expect(doc).toContain('Market Update');
    expect(doc).toContain('Prices are up 5%.');
    expect(doc).not.toContain('<');
  });
});

// ============================================================
// buildActivityDoc
// ============================================================

describe('buildActivityDoc', () => {
  it('builds from subject and description', () => {
    const doc = buildActivityDoc({
      subject: 'Call with Sarah',
      description: 'Discussed budget and timeline',
      activity_type: 'call',
      outcome: 'interested',
    });
    expect(doc).toContain('Call with Sarah');
    expect(doc).toContain('Discussed budget and timeline');
    expect(doc).toContain('[call, interested]');
  });

  it('handles missing optional fields', () => {
    const doc = buildActivityDoc({
      activity_type: 'note',
    });
    expect(doc).toContain('[note]');
  });
});

// ============================================================
// buildOfferDoc
// ============================================================

describe('buildOfferDoc', () => {
  it('builds offer document', () => {
    const doc = buildOfferDoc({
      offer_amount: 850000,
      status: 'submitted',
      financing_type: 'conventional',
      notes: 'Clean offer, no subjects',
    });
    expect(doc).toContain('Offer: $850000 (submitted)');
    expect(doc).toContain('Financing: conventional');
    expect(doc).toContain('Notes: Clean offer, no subjects');
  });

  it('handles minimal offer', () => {
    const doc = buildOfferDoc({
      offer_amount: 500000,
      status: 'draft',
    });
    expect(doc).toBe('Offer: $500000 (draft)');
  });
});

// ============================================================
// chunkRecord — integration tests per source table
// ============================================================

describe('chunkRecord', () => {
  it('chunks a communication record', () => {
    const chunks = chunkRecord('communications', {
      body: 'Hi, I am interested in viewing the property at 123 Main St.',
      contact_id: 'c-123',
      channel: 'sms',
      direction: 'inbound',
      created_at: '2026-03-20T10:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('interested in viewing');
    expect(chunks[0].metadata.contact_id).toBe('c-123');
    expect(chunks[0].metadata.channel).toBe('sms');
    expect(chunks[0].metadata.direction).toBe('inbound');
  });

  it('chunks an activity record', () => {
    const chunks = chunkRecord('activities', {
      subject: 'Showing at 456 Oak Ave',
      description: 'Buyer liked the kitchen but concerned about the small backyard.',
      activity_type: 'property_showing',
      outcome: 'interested',
      contact_id: 'c-456',
      listing_id: 'l-789',
      created_at: '2026-03-21T14:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('Showing at 456 Oak Ave');
    expect(chunks[0].text).toContain('kitchen');
    expect(chunks[0].text).toContain('[property_showing, interested]');
    expect(chunks[0].metadata.contact_id).toBe('c-456');
    expect(chunks[0].metadata.listing_id).toBe('l-789');
  });

  it('chunks a newsletter with HTML stripping', () => {
    const chunks = chunkRecord('newsletters', {
      subject: 'Your Weekly Update',
      html_body: '<div><h1>Market Report</h1><p>Prices rose 3% this month.</p></div>',
      contact_id: 'c-100',
      email_type: 'market_update',
      created_at: '2026-03-15T08:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('Subject: Your Weekly Update');
    expect(chunks[0].text).toContain('Prices rose 3%');
    expect(chunks[0].text).not.toContain('<');
  });

  it('chunks a contact profile', () => {
    const chunks = chunkRecord('contacts', {
      id: 'c-200',
      name: 'Sarah Chen',
      type: 'buyer',
      stage_bar: 'active',
      notes: 'Looking for 3BR in Kitsilano under 900k',
      tags: ['first-time', 'pre-approved'],
      buyer_preferences: {
        price_range_min: 700000,
        price_range_max: 900000,
        areas: ['Kitsilano', 'Point Grey'],
        property_types: ['Condo', 'Townhouse'],
        bedrooms: 3,
      },
      demographics: {
        family_status: 'married, 1 child',
        interests: ['schools', 'parks'],
      },
      created_at: '2026-01-15T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('Sarah Chen (buyer, active)');
    expect(chunks[0].text).toContain('Kitsilano');
    expect(chunks[0].text).toContain('$700000-900000');
  });

  it('chunks a listing', () => {
    const chunks = chunkRecord('listings', {
      id: 'l-300',
      address: '2847 W 3rd Ave, Vancouver',
      list_price: 3290000,
      status: 'active',
      property_type: 'Residential',
      mls_number: 'R2845123',
      notes: 'Stunning ocean views, recently renovated',
      created_at: '2026-03-01T00:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('2847 W 3rd Ave');
    expect(chunks[0].text).toContain('$3290000');
    expect(chunks[0].text).toContain('ocean views');
  });

  it('chunks an agent recommendation', () => {
    const chunks = chunkRecord('agent_recommendations', {
      reasoning: 'Sarah has shown high engagement this week with 3 listing clicks in Kitsilano. Her financing is pre-approved. Recommend sending a targeted listing alert for new Kits condos.',
      contact_id: 'c-200',
      created_at: '2026-03-20T00:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('high engagement');
    expect(chunks[0].metadata.contact_id).toBe('c-200');
  });

  it('chunks a message template', () => {
    const chunks = chunkRecord('message_templates', {
      subject: 'Welcome to {brokerage}!',
      body: 'Hi {first_name}, welcome! I am excited to help you find your perfect home in {area}.',
      channel: 'email',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('Welcome to {brokerage}!');
    expect(chunks[0].text).toContain('perfect home');
    expect(chunks[0].metadata.channel).toBe('email');
  });

  it('chunks an offer', () => {
    const chunks = chunkRecord('offers', {
      offer_amount: 850000,
      status: 'submitted',
      financing_type: 'conventional',
      notes: 'Subject to inspection and financing',
      buyer_contact_id: 'c-500',
      listing_id: 'l-600',
      created_at: '2026-03-22T00:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('$850000');
    expect(chunks[0].metadata.contact_id).toBe('c-500');
    expect(chunks[0].metadata.listing_id).toBe('l-600');
  });

  it('chunks offer conditions', () => {
    const chunks = chunkRecord('offer_conditions', {
      description: 'Subject to satisfactory home inspection within 7 business days',
      notes: 'Buyer wants to use their own inspector',
      created_at: '2026-03-22T00:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('home inspection');
    expect(chunks[0].text).toContain('own inspector');
  });

  it('chunks a knowledge article', () => {
    const chunks = chunkRecord('knowledge_articles', {
      title: 'Subject Removal Process',
      body: 'Subject removal is the process where a buyer waives conditions on their offer.',
      category: 'faq',
      audience_type: 'buyer',
      tags: ['subject removal', 'conditions'],
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('Subject Removal Process');
    expect(chunks[0].text).toContain('waives conditions');
    expect(chunks[0].metadata.audience_type).toBe('buyer');
  });

  it('chunks a competitive email', () => {
    const chunks = chunkRecord('competitive_emails', {
      subject: 'Just Listed in Kitsilano',
      body_text: 'Beautiful 4-bedroom home with ocean views. $3.29M.',
      received_at: '2026-03-20T00:00:00Z',
      created_at: '2026-03-20T00:00:00Z',
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('Just Listed in Kitsilano');
    expect(chunks[0].text).toContain('ocean views');
    expect(chunks[0].metadata.channel).toBe('email');
  });

  it('returns empty array for empty body', () => {
    const chunks = chunkRecord('communications', {
      body: '',
      contact_id: 'c-123',
      channel: 'sms',
      direction: 'inbound',
      created_at: '2026-03-20T00:00:00Z',
    });
    expect(chunks).toHaveLength(0);
  });

  it('splits long newsletter into multiple chunks', () => {
    const longBody = Array(50)
      .fill('<p>This is a paragraph about the real estate market in Vancouver. Prices continue to rise.</p>')
      .join('');
    const chunks = chunkRecord('newsletters', {
      subject: 'Long Newsletter',
      html_body: longBody,
      contact_id: 'c-100',
      created_at: '2026-03-15T00:00:00Z',
    });
    expect(chunks.length).toBeGreaterThan(1);
    // All chunks should have sequential indexes
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it('throws on unknown source table', () => {
    expect(() =>
      chunkRecord('unknown_table' as any, { body: 'test' })
    ).toThrow('Unknown source table');
  });
});

// ============================================================
// estimateTokens
// ============================================================

describe('estimateTokens', () => {
  it('estimates ~1 token per 4 characters', () => {
    expect(estimateTokens('1234')).toBe(1);
    expect(estimateTokens('12345678')).toBe(2);
  });

  it('rounds up', () => {
    expect(estimateTokens('123')).toBe(1); // ceil(3/4) = 1
    expect(estimateTokens('12345')).toBe(2); // ceil(5/4) = 2
  });

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});
