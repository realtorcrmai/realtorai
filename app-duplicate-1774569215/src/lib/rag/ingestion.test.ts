// ============================================================
// Comprehensive Tests for RAG Phase 2: Ingestion Pipeline
// ============================================================
// Note: ingestRecord/backfill require Supabase + Voyage API.
// These tests validate the logic flow, data shapes, and edge cases
// using the public functions from chunker + embeddings that ingestion depends on.

import { describe, it, expect } from 'vitest';
import { chunkRecord } from './chunker';
import { contentHash } from './embeddings';
import type { SourceTable, EmbeddingRecord } from './types';
import { SOURCE_TO_CONTENT_TYPE } from './types';

// ---------- Ingestion data flow simulation ----------

/**
 * Simulates the ingestion pipeline without external deps.
 * Tests the exact data transformations that ingestRecord performs.
 */
function simulateIngest(
  sourceTable: SourceTable,
  sourceId: string,
  record: Record<string, unknown>
): { chunks: number; records: Partial<EmbeddingRecord>[]; hashes: string[] } {
  const chunks = chunkRecord(sourceTable, record);
  if (chunks.length === 0) return { chunks: 0, records: [], hashes: [] };

  const hashes = chunks.map((c) => contentHash(c.text));

  let contentType = SOURCE_TO_CONTENT_TYPE[sourceTable];
  if (sourceTable === 'knowledge_articles' && record.category) {
    const cat = record.category as string;
    if (['faq', 'playbook', 'script', 'process', 'explainer'].includes(cat)) {
      contentType = cat as any;
    }
  }

  const records = chunks.map((chunk, i) => ({
    source_table: sourceTable,
    source_id: sourceId,
    chunk_index: chunk.index,
    content_text: chunk.text,
    content_type: contentType,
    contact_id: chunk.metadata.contact_id,
    listing_id: chunk.metadata.listing_id,
    channel: chunk.metadata.channel,
    direction: chunk.metadata.direction,
    content_hash: hashes[i],
    source_created_at: chunk.metadata.source_created_at,
  }));

  return { chunks: chunks.length, records, hashes };
}

// ============================================================
// Ingestion flow tests per source table
// ============================================================

describe('Ingestion Pipeline — Communications', () => {
  it('produces correct embedding record shape', () => {
    const { chunks, records, hashes } = simulateIngest('communications', 'comm-001', {
      body: 'Hi, I want to schedule a showing for the property on Main Street.',
      contact_id: 'contact-123',
      channel: 'sms',
      direction: 'inbound',
      created_at: '2026-03-20T10:00:00Z',
    });

    expect(chunks).toBe(1);
    expect(records[0].source_table).toBe('communications');
    expect(records[0].source_id).toBe('comm-001');
    expect(records[0].chunk_index).toBe(0);
    expect(records[0].content_type).toBe('message');
    expect(records[0].contact_id).toBe('contact-123');
    expect(records[0].channel).toBe('sms');
    expect(records[0].direction).toBe('inbound');
    expect(hashes[0]).toHaveLength(64);
  });

  it('skips empty body', () => {
    const { chunks } = simulateIngest('communications', 'comm-002', {
      body: '',
      contact_id: 'contact-123',
      channel: 'email',
      direction: 'outbound',
      created_at: '2026-03-20T10:00:00Z',
    });
    expect(chunks).toBe(0);
  });
});

describe('Ingestion Pipeline — Activities', () => {
  it('combines subject + description + metadata', () => {
    const { records } = simulateIngest('activities', 'act-001', {
      subject: 'Showing at 456 Oak Ave',
      description: 'Buyer loved the kitchen. Concerned about small yard.',
      activity_type: 'property_showing',
      outcome: 'interested',
      contact_id: 'c-100',
      listing_id: 'l-200',
      created_at: '2026-03-21T14:00:00Z',
    });

    expect(records).toHaveLength(1);
    expect(records[0].content_text).toContain('Showing at 456 Oak Ave');
    expect(records[0].content_text).toContain('kitchen');
    expect(records[0].content_text).toContain('[property_showing, interested]');
    expect(records[0].contact_id).toBe('c-100');
    expect(records[0].listing_id).toBe('l-200');
    expect(records[0].content_type).toBe('activity');
  });
});

describe('Ingestion Pipeline — Newsletters', () => {
  it('strips HTML before embedding', () => {
    const { records } = simulateIngest('newsletters', 'nl-001', {
      subject: 'March Market Update',
      html_body: '<div><h1>Market Report</h1><p>Prices rose <strong>3%</strong> this month.</p></div>',
      contact_id: 'c-200',
      email_type: 'market_update',
      created_at: '2026-03-15T08:00:00Z',
    });

    expect(records).toHaveLength(1);
    expect(records[0].content_text).toContain('Subject: March Market Update');
    expect(records[0].content_text).toContain('Prices rose 3% this month');
    expect(records[0].content_text).not.toContain('<');
    expect(records[0].content_type).toBe('email');
  });

  it('splits long newsletters into multiple chunks', () => {
    const longBody = Array(50)
      .fill('<p>This is a paragraph about the Vancouver real estate market conditions and recent sales data.</p>')
      .join('');
    const { chunks, records } = simulateIngest('newsletters', 'nl-002', {
      subject: 'Long Newsletter',
      html_body: longBody,
      contact_id: 'c-200',
      created_at: '2026-03-15T08:00:00Z',
    });

    expect(chunks).toBeGreaterThan(1);
    expect(records.length).toBe(chunks);
    // Verify sequential chunk indexes
    records.forEach((r, i) => {
      expect(r.chunk_index).toBe(i);
      expect(r.source_id).toBe('nl-002');
    });
  });
});

describe('Ingestion Pipeline — Contacts', () => {
  it('builds composite profile document', () => {
    const { records } = simulateIngest('contacts', 'c-300', {
      id: 'c-300',
      name: 'Sarah Chen',
      type: 'buyer',
      stage_bar: 'active',
      notes: 'Looking for 3BR in Kitsilano under 900k',
      tags: ['first-time', 'pre-approved'],
      buyer_preferences: {
        price_range_min: 700000,
        price_range_max: 900000,
        areas: ['Kitsilano', 'Point Grey'],
        property_types: ['Condo'],
        bedrooms: 3,
      },
      demographics: {
        family_status: 'married, 1 child',
        interests: ['schools', 'parks'],
      },
      created_at: '2026-01-15T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    });

    expect(records).toHaveLength(1);
    expect(records[0].content_type).toBe('profile');
    expect(records[0].content_text).toContain('Sarah Chen (buyer, active)');
    expect(records[0].content_text).toContain('Kitsilano');
    expect(records[0].content_text).toContain('$700000-900000');
    expect(records[0].content_text).toContain('schools');
  });
});

describe('Ingestion Pipeline — Knowledge Articles', () => {
  it('overrides content_type from category', () => {
    const { records: faqRecords } = simulateIngest('knowledge_articles', 'kb-001', {
      title: 'What is subject removal?',
      body: 'Subject removal is when a buyer waives conditions.',
      category: 'faq',
      audience_type: 'buyer',
      tags: ['subject removal'],
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(faqRecords[0].content_type).toBe('faq');

    const { records: pbRecords } = simulateIngest('knowledge_articles', 'kb-002', {
      title: 'Listing Onboarding',
      body: 'Step 1: Initial contact...',
      category: 'playbook',
      audience_type: 'agent',
      tags: ['listing'],
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(pbRecords[0].content_type).toBe('playbook');

    const { records: scriptRecords } = simulateIngest('knowledge_articles', 'kb-003', {
      title: 'Price Reduction Script',
      body: 'Use this script when recommending a price reduction.',
      category: 'script',
      audience_type: 'seller',
      tags: ['pricing'],
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(scriptRecords[0].content_type).toBe('script');
  });
});

describe('Ingestion Pipeline — Competitive Emails', () => {
  it('combines subject + body_text', () => {
    const { records } = simulateIngest('competitive_emails', 'ce-001', {
      subject: 'Just Listed in Kitsilano',
      body_text: 'Beautiful 4-bedroom home with ocean views. $3.29M. Book your private showing today.',
      received_at: '2026-03-20T00:00:00Z',
      created_at: '2026-03-20T00:00:00Z',
    });

    expect(records).toHaveLength(1);
    expect(records[0].content_type).toBe('competitor');
    expect(records[0].content_text).toContain('Just Listed in Kitsilano');
    expect(records[0].content_text).toContain('ocean views');
    expect(records[0].channel).toBe('email');
  });
});

describe('Ingestion Pipeline — Offers', () => {
  it('builds offer document with financing', () => {
    const { records } = simulateIngest('offers', 'offer-001', {
      offer_amount: 850000,
      status: 'submitted',
      financing_type: 'conventional',
      notes: 'Subject to inspection and financing. 5 business days.',
      buyer_contact_id: 'c-500',
      listing_id: 'l-600',
      created_at: '2026-03-22T00:00:00Z',
    });

    expect(records).toHaveLength(1);
    expect(records[0].content_type).toBe('offer');
    expect(records[0].content_text).toContain('$850000');
    expect(records[0].content_text).toContain('conventional');
    expect(records[0].contact_id).toBe('c-500');
    expect(records[0].listing_id).toBe('l-600');
  });
});

// ============================================================
// Dedup logic tests
// ============================================================

describe('Ingestion Pipeline — Dedup', () => {
  it('same content produces same hash', () => {
    const r1 = simulateIngest('communications', 'c1', {
      body: 'Hello, I am interested.',
      contact_id: 'x', channel: 'sms', direction: 'inbound', created_at: '2026-01-01',
    });
    const r2 = simulateIngest('communications', 'c2', {
      body: 'Hello, I am interested.',
      contact_id: 'y', channel: 'email', direction: 'outbound', created_at: '2026-02-01',
    });
    expect(r1.hashes[0]).toBe(r2.hashes[0]);
  });

  it('different content produces different hash', () => {
    const r1 = simulateIngest('communications', 'c1', {
      body: 'Hello, I am interested.',
      contact_id: 'x', channel: 'sms', direction: 'inbound', created_at: '2026-01-01',
    });
    const r2 = simulateIngest('communications', 'c2', {
      body: 'Hi, when can I see the property?',
      contact_id: 'x', channel: 'sms', direction: 'inbound', created_at: '2026-01-01',
    });
    expect(r1.hashes[0]).not.toBe(r2.hashes[0]);
  });

  it('updated contact produces different hash', () => {
    const r1 = simulateIngest('contacts', 'c1', {
      id: 'c1', name: 'John', type: 'buyer', notes: 'Looking in Surrey',
      created_at: '2026-01-01',
    });
    const r2 = simulateIngest('contacts', 'c1', {
      id: 'c1', name: 'John', type: 'buyer', notes: 'Looking in Langley now',
      created_at: '2026-01-01',
    });
    expect(r1.hashes[0]).not.toBe(r2.hashes[0]);
  });
});

// ============================================================
// Edge cases
// ============================================================

describe('Ingestion Pipeline — Edge Cases', () => {
  it('handles record with only required fields', () => {
    const { records } = simulateIngest('contacts', 'c-min', {
      id: 'c-min',
      name: 'Minimal Contact',
      type: 'other',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(records).toHaveLength(1);
    expect(records[0].content_text).toContain('Minimal Contact');
  });

  it('handles listing with null price', () => {
    const { records } = simulateIngest('listings', 'l-null', {
      id: 'l-null',
      address: '789 Elm St',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(records).toHaveLength(1);
    expect(records[0].content_text).toContain('$TBD');
  });

  it('handles offer condition with only description', () => {
    const { records } = simulateIngest('offer_conditions', 'oc-001', {
      description: 'Subject to satisfactory inspection',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(records).toHaveLength(1);
    expect(records[0].content_text).toContain('inspection');
  });

  it('handles offer condition with only notes', () => {
    const { records } = simulateIngest('offer_conditions', 'oc-002', {
      notes: 'Buyer will use their own inspector',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(records).toHaveLength(1);
    expect(records[0].content_text).toContain('own inspector');
  });

  it('all source tables produce valid records', () => {
    const testRecords: Record<SourceTable, Record<string, unknown>> = {
      communications: { body: 'Test msg', contact_id: 'c1', channel: 'sms', direction: 'inbound', created_at: '2026-01-01' },
      activities: { subject: 'Call', activity_type: 'call', contact_id: 'c1', created_at: '2026-01-01' },
      newsletters: { subject: 'Test', html_body: '<p>Body</p>', contact_id: 'c1', created_at: '2026-01-01' },
      contacts: { id: 'c1', name: 'Test', type: 'buyer', created_at: '2026-01-01' },
      listings: { id: 'l1', address: '123 St', status: 'active', created_at: '2026-01-01' },
      agent_recommendations: { reasoning: 'Contact is engaged', contact_id: 'c1', created_at: '2026-01-01' },
      message_templates: { body: 'Hi {name}', created_at: '2026-01-01' },
      offers: { offer_amount: 500000, status: 'draft', created_at: '2026-01-01' },
      offer_conditions: { description: 'Subject to financing', created_at: '2026-01-01' },
      knowledge_articles: { title: 'FAQ', body: 'Answer', category: 'faq', created_at: '2026-01-01' },
      competitive_emails: { subject: 'Competitor', body_text: 'Email body', created_at: '2026-01-01' },
    };

    for (const [table, record] of Object.entries(testRecords)) {
      const { chunks, records } = simulateIngest(table as SourceTable, `test-${table}`, record);
      expect(chunks).toBeGreaterThan(0);
      expect(records[0].source_table).toBe(table);
      expect(records[0].content_hash).toHaveLength(64);
    }
  });
});
