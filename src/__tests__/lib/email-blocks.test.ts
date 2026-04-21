/**
 * Tests for src/lib/email-blocks.ts
 *
 * Tests the modular email block builder and assembleEmail function.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { assembleEmail, type EmailData } from '@/lib/email-blocks';

// ═══════════════════════════════════════════════
// HELPERS — minimal valid EmailData
// ═══════════════════════════════════════════════

function makeData(overrides: Partial<EmailData> = {}): EmailData {
  return {
    contact: { name: 'Alice Johnson', firstName: 'Alice', type: 'buyer' },
    agent: { name: 'Agent Bob', brokerage: 'RE/MAX', phone: '604-555-1234' },
    content: {
      subject: 'New Listing for You',
      intro: 'I found a property that matches your criteria.',
      body: 'This stunning 3-bed home is in your preferred neighbourhood.',
      ctaText: 'View Listing',
      ctaUrl: 'https://example.com/listing/1',
    },
    ...overrides,
  };
}

function makeListingData(overrides: Partial<EmailData> = {}): EmailData {
  return makeData({
    listing: {
      address: '123 Main St, Vancouver',
      area: 'Kitsilano',
      price: 899000,
      beds: 3,
      baths: 2,
      sqft: '1800',
      year: 2005,
      photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      features: [
        { icon: '🏊', title: 'Pool', desc: 'Heated outdoor pool' },
        { icon: '🌳', title: 'Garden', desc: 'Landscaped backyard' },
      ],
    },
    ...overrides,
  });
}

// ═══════════════════════════════════════════════
// assembleEmail — basic structure
// ═══════════════════════════════════════════════

describe('assembleEmail', () => {
  it('REQ-NEWSLETTER-002 TC-EB-001: returns a string containing DOCTYPE declaration @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('REQ-NEWSLETTER-002 TC-EB-002: returns valid HTML with opening and closing tags @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });

  it('REQ-NEWSLETTER-002 TC-EB-003: includes meta charset and viewport @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain('viewport');
  });

  it('REQ-NEWSLETTER-002 TC-EB-004: includes the email subject in preheader text @p0', () => {
    const data = makeData({ content: { ...makeData().content, subject: 'Special Offer Inside' } });
    const html = assembleEmail('welcome', data);
    expect(html).toContain('Special Offer Inside');
  });

  it('REQ-NEWSLETTER-002 TC-EB-005: includes the contact first name in personal note @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('Alice');
  });

  it('REQ-NEWSLETTER-002 TC-EB-006: includes the agent name in agent card @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('Agent Bob');
  });

  it('REQ-NEWSLETTER-002 TC-EB-007: includes the brokerage in agent card @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('RE/MAX');
  });

  it('REQ-NEWSLETTER-002 TC-EB-008: includes CTA text @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('View Listing');
  });

  it('REQ-NEWSLETTER-002 TC-EB-009: includes unsubscribe link in footer @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('Unsubscribe');
  });
});

// ═══════════════════════════════════════════════
// assembleEmail — email types
// ═══════════════════════════════════════════════

describe('assembleEmail email types', () => {
  it('REQ-NEWSLETTER-002 TC-EB-010: listing_alert includes listing address @p0', () => {
    const html = assembleEmail('listing_alert', makeListingData());
    expect(html).toContain('123 Main St, Vancouver');
  });

  it('REQ-NEWSLETTER-002 TC-EB-011: listing_alert includes formatted price @p0', () => {
    const html = assembleEmail('listing_alert', makeListingData());
    expect(html).toContain('899');
  });

  it('REQ-NEWSLETTER-002 TC-EB-012: listing_alert includes bed/bath counts @p0', () => {
    const html = assembleEmail('listing_alert', makeListingData());
    expect(html).toContain('3');
    expect(html).toContain('2');
  });

  it('REQ-NEWSLETTER-002 TC-EB-013: market_update renders stats when market data present @p0', () => {
    const data = makeData({
      market: { avgPrice: '$1.2M', avgDom: 18, inventoryChange: '+12%' },
    });
    const html = assembleEmail('market_update', data);
    expect(html).toContain('$1.2M');
    expect(html).toContain('18');
  });

  it('REQ-NEWSLETTER-002 TC-EB-014: home_anniversary renders anniversary comparison when data present @p0', () => {
    const data = makeData({
      anniversary: {
        purchasePrice: '$650,000',
        currentEstimate: '$820,000',
        appreciation: '26%',
        equityGained: '$170,000',
      },
    });
    const html = assembleEmail('home_anniversary', data);
    expect(html).toContain('$650,000');
    expect(html).toContain('$820,000');
  });

  it('REQ-NEWSLETTER-002 TC-EB-015: falls back to welcome template for unknown email types @p1', () => {
    const html = assembleEmail('nonexistent_type', makeData());
    // Should still produce valid HTML (uses welcome blocks)
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Agent Bob');
  });
});

// ═══════════════════════════════════════════════
// assembleEmail — dark mode support
// ═══════════════════════════════════════════════

describe('assembleEmail dark mode', () => {
  it('REQ-NEWSLETTER-002 TC-EB-016: includes dark mode media query @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('prefers-color-scheme: dark');
  });

  it('REQ-NEWSLETTER-002 TC-EB-017: includes email-body class for dark mode targeting @p0', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('email-body');
  });
});

// ═══════════════════════════════════════════════
// Property-based tests (fast-check)
// ═══════════════════════════════════════════════

describe('email-blocks property tests', () => {
  const emailTypes = [
    'listing_alert', 'welcome', 'market_update', 'neighbourhood_guide',
    'home_anniversary', 'just_sold', 'open_house', 'seller_report',
    'cma_preview', 're_engagement', 'luxury_showcase',
  ];

  it('REQ-NEWSLETTER-002 TC-EB-018: assembleEmail always returns a string starting with DOCTYPE @p2', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...emailTypes),
        (emailType) => {
          const html = assembleEmail(emailType, makeData());
          expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
        },
      ),
      { numRuns: 30 },
    );
  });

  it('REQ-NEWSLETTER-002 TC-EB-019: assembleEmail always contains html/body tags for any email type @p2', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...emailTypes),
        (emailType) => {
          const html = assembleEmail(emailType, makeData());
          expect(html).toContain('<html>');
          expect(html).toContain('</html>');
          expect(html).toContain('</body>');
        },
      ),
      { numRuns: 30 },
    );
  });

  it('REQ-NEWSLETTER-002 TC-EB-020: random content strings in subject/intro/body do not break output @p2', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 200 }),
        fc.string({ maxLength: 200 }),
        fc.string({ maxLength: 500 }),
        (subject, intro, body) => {
          const data = makeData({
            content: { subject, intro, body, ctaText: 'Click', ctaUrl: '#' },
          });
          const html = assembleEmail('welcome', data);
          expect(html).toContain('<!DOCTYPE html>');
          expect(html).toContain('</html>');
        },
      ),
      { numRuns: 50 },
    );
  });

  it('REQ-NEWSLETTER-002 TC-EB-021: random contact names do not break output @p2', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (name, firstName) => {
          const data = makeData({
            contact: { name, firstName, type: 'buyer' },
          });
          const html = assembleEmail('welcome', data);
          expect(typeof html).toBe('string');
          expect(html.length).toBeGreaterThan(100);
        },
      ),
      { numRuns: 50 },
    );
  });
});
