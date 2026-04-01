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
  it('returns a string containing DOCTYPE declaration', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('returns valid HTML with opening and closing tags', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });

  it('includes meta charset and viewport', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain('viewport');
  });

  it('includes the email subject in preheader text', () => {
    const data = makeData({ content: { ...makeData().content, subject: 'Special Offer Inside' } });
    const html = assembleEmail('welcome', data);
    expect(html).toContain('Special Offer Inside');
  });

  it('includes the contact first name in personal note', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('Alice');
  });

  it('includes the agent name in agent card', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('Agent Bob');
  });

  it('includes the brokerage in agent card', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('RE/MAX');
  });

  it('includes CTA text', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('View Listing');
  });

  it('includes unsubscribe link in footer', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('Unsubscribe');
  });
});

// ═══════════════════════════════════════════════
// assembleEmail — email types
// ═══════════════════════════════════════════════

describe('assembleEmail email types', () => {
  it('listing_alert includes listing address', () => {
    const html = assembleEmail('listing_alert', makeListingData());
    expect(html).toContain('123 Main St, Vancouver');
  });

  it('listing_alert includes formatted price', () => {
    const html = assembleEmail('listing_alert', makeListingData());
    expect(html).toContain('899');
  });

  it('listing_alert includes bed/bath counts', () => {
    const html = assembleEmail('listing_alert', makeListingData());
    expect(html).toContain('3');
    expect(html).toContain('2');
  });

  it('market_update renders stats when market data present', () => {
    const data = makeData({
      market: { avgPrice: '$1.2M', avgDom: 18, inventoryChange: '+12%' },
    });
    const html = assembleEmail('market_update', data);
    expect(html).toContain('$1.2M');
    expect(html).toContain('18');
  });

  it('home_anniversary renders anniversary comparison when data present', () => {
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

  it('falls back to welcome template for unknown email types', () => {
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
  it('includes dark mode media query', () => {
    const html = assembleEmail('welcome', makeData());
    expect(html).toContain('prefers-color-scheme:dark');
  });

  it('includes email-body class for dark mode targeting', () => {
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

  it('assembleEmail always returns a string starting with DOCTYPE', () => {
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

  it('assembleEmail always contains html/body tags for any email type', () => {
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

  it('random content strings in subject/intro/body do not break output', () => {
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

  it('random contact names do not break output', () => {
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
