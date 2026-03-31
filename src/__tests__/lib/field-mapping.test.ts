/**
 * Tests for src/lib/forms/field-mapping.ts
 *
 * Tests the CRM context path resolver and field mapping for PDF form filling.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { applyFieldMapping, type CrmContext } from '@/lib/forms/field-mapping';

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function makeContext(overrides: Partial<CrmContext> = {}): CrmContext {
  return {
    listing: {
      address: '123 Main St, Vancouver, BC',
      list_price: 899000,
      beds: 3,
      baths: 2,
      sqft: '1800',
      mls_number: 'R2801234',
      property_type: 'Single Family',
    },
    seller: {
      name: 'Jane Smith',
      phone: '+16045551234',
      email: 'jane@example.com',
    },
    user: {
      name: 'Agent Bob',
      email: 'bob@brokerage.com',
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// applyFieldMapping — basic resolution
// ═══════════════════════════════════════════════

describe('applyFieldMapping', () => {
  it('resolves simple listing fields', () => {
    const ctx = makeContext();
    const result = applyFieldMapping(
      { propertyAddress: 'listing.address' },
      ctx,
    );
    expect(result.propertyAddress).toBe('123 Main St, Vancouver, BC');
  });

  it('resolves seller fields', () => {
    const ctx = makeContext();
    const result = applyFieldMapping(
      { clientName: 'seller.name', clientPhone: 'seller.phone' },
      ctx,
    );
    expect(result.clientName).toBe('Jane Smith');
    expect(result.clientPhone).toBe('+16045551234');
  });

  it('resolves user (agent) fields', () => {
    const ctx = makeContext();
    const result = applyFieldMapping(
      { agentName: 'user.name', agentEmail: 'user.email' },
      ctx,
    );
    expect(result.agentName).toBe('Agent Bob');
    expect(result.agentEmail).toBe('bob@brokerage.com');
  });

  it('resolves the special _today path to a date string', () => {
    const result = applyFieldMapping({ date: '_today' }, makeContext());
    // Should be in YYYY-MM-DD format
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats price fields as Canadian currency', () => {
    const result = applyFieldMapping(
      { price: 'listing.list_price' },
      makeContext(),
    );
    // Should contain $ and the number (locale-dependent, but should contain "899")
    expect(result.price).toContain('899');
    expect(result.price).toContain('$');
  });

  it('converts numeric non-price fields to string', () => {
    const result = applyFieldMapping(
      { bedrooms: 'listing.beds' },
      makeContext(),
    );
    expect(result.bedrooms).toBe('3');
  });

  it('omits fields that resolve to empty string', () => {
    const ctx = makeContext({ listing: { address: '123 Main' } });
    const result = applyFieldMapping(
      {
        propertyAddress: 'listing.address',
        missingField: 'listing.nonexistent',
      },
      ctx,
    );
    expect(result.propertyAddress).toBe('123 Main');
    expect(result).not.toHaveProperty('missingField');
  });

  it('handles null seller email gracefully', () => {
    const ctx = makeContext({ seller: { name: 'Test', phone: '555', email: null } });
    const result = applyFieldMapping(
      { email: 'seller.email' },
      ctx,
    );
    // null resolves to empty string, which is omitted
    expect(result).not.toHaveProperty('email');
  });

  it('handles null user fields gracefully', () => {
    const ctx = makeContext({ user: { name: null, email: null } });
    const result = applyFieldMapping(
      { agentName: 'user.name' },
      ctx,
    );
    expect(result).not.toHaveProperty('agentName');
  });

  it('returns empty object for empty mapping', () => {
    const result = applyFieldMapping({}, makeContext());
    expect(result).toEqual({});
  });

  it('handles deeply nested paths that do not exist', () => {
    const result = applyFieldMapping(
      { deep: 'listing.a.b.c.d' },
      makeContext(),
    );
    expect(result).not.toHaveProperty('deep');
  });

  it('maps multiple fields at once', () => {
    const ctx = makeContext();
    const mapping = {
      address: 'listing.address',
      sellerName: 'seller.name',
      agentEmail: 'user.email',
      date: '_today',
    };
    const result = applyFieldMapping(mapping, ctx);
    expect(Object.keys(result)).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════
// Property-based tests (fast-check)
// ═══════════════════════════════════════════════

describe('field-mapping property tests', () => {
  it('never throws on arbitrary field mappings', () => {
    const ctx = makeContext();
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 30 }), fc.string({ minLength: 1, maxLength: 50 })),
        (mapping) => {
          // Should not throw regardless of path values
          const result = applyFieldMapping(mapping, ctx);
          expect(typeof result).toBe('object');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('result keys are always a subset of mapping keys', () => {
    const ctx = makeContext();
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.constantFrom('a', 'b', 'c', 'd', 'e'),
          fc.constantFrom('listing.address', 'seller.name', 'user.email', '_today', 'listing.nonexistent'),
        ),
        (mapping) => {
          const result = applyFieldMapping(mapping, ctx);
          for (const key of Object.keys(result)) {
            expect(mapping).toHaveProperty(key);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('result values are always non-empty strings', () => {
    const ctx = makeContext();
    const validPaths = ['listing.address', 'seller.name', 'seller.phone', 'user.name', 'user.email', '_today'];
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...validPaths),
        ),
        (mapping) => {
          const result = applyFieldMapping(mapping, ctx);
          for (const value of Object.values(result)) {
            expect(typeof value).toBe('string');
            expect(value.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('_today always produces a valid ISO date', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        (fieldName) => {
          const result = applyFieldMapping({ [fieldName]: '_today' }, makeContext());
          if (result[fieldName]) {
            expect(result[fieldName]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
