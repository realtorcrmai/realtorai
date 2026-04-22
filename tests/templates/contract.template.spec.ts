/**
 * L3 CONTRACT TEST TEMPLATE — Realtors360 CRM
 *
 * File placement: tests/contract/<resource>.spec.ts
 *   tests/contract/api-contacts.spec.ts
 *   tests/contract/api-listings.spec.ts
 *
 * PURPOSE: Verify that API response shapes match what the frontend expects.
 * These tests catch silent API drift — a backend rename that breaks the UI.
 *
 * RULES:
 *   - Test the SHAPE, not the values (use expect.any(String), expect.any(Number))
 *   - Every endpoint the frontend calls gets a contract test
 *   - Contract tests are fast (no DB, no network) — they validate Zod schemas or API responses
 */
import { describe, it, expect } from 'vitest';
// import { z } from 'zod';  // If using Zod schema validation

// --- REPLACE WITH YOUR ACTUAL SCHEMAS ---

// Example: Contact API response shape
const CONTACT_SHAPE = {
  id: expect.any(String),
  name: expect.any(String),
  type: expect.stringMatching(/^(buyer|seller|both|other)$/),
  email: expect.toBeOneOf([expect.any(String), null]),
  phone: expect.toBeOneOf([expect.any(String), null]),
  realtor_id: expect.any(String),
  created_at: expect.any(String),
  updated_at: expect.any(String),
};

// Example: Listing API response shape
const LISTING_SHAPE = {
  id: expect.any(String),
  address: expect.any(String),
  status: expect.stringMatching(/^(active|conditional|pending|sold|expired|withdrawn)$/),
  list_price: expect.toBeOneOf([expect.any(Number), null]),
  property_type: expect.any(String),
  realtor_id: expect.any(String),
};

describe('Contact API contract', () => {
  it('REQ-CONTACT-002 TC-CO-001: GET /api/contacts returns array of contact shapes @p0', async () => {
    const res = await fetch('http://localhost:3000/api/contacts', {
      headers: {
        // Auth header needed
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      expect(body[0]).toMatchObject(CONTACT_SHAPE);
    }
  });

  it('REQ-CONTACT-002 TC-CO-002: GET /api/contacts/:id returns single contact shape @p0', async () => {
    // Fetch a known contact ID
    const listRes = await fetch('http://localhost:3000/api/contacts');
    const contacts = await listRes.json();
    if (contacts.length === 0) return; // Skip if no data

    const res = await fetch(`http://localhost:3000/api/contacts/${contacts[0].id}`);
    expect(res.status).toBe(200);

    const contact = await res.json();
    expect(contact).toMatchObject(CONTACT_SHAPE);
  });
});

describe('Listing API contract', () => {
  it('REQ-LISTING-002 TC-LO-001: GET /api/listings returns array of listing shapes @p0', async () => {
    const res = await fetch('http://localhost:3000/api/listings');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);

    if (body.length > 0) {
      expect(body[0]).toMatchObject(LISTING_SHAPE);
    }
  });
});

// --- ZOD SCHEMA CONTRACT PATTERN ---
// If you export Zod schemas from src/types/ or src/lib/validators/,
// you can test them directly:
//
// import { contactSchema } from '@/types/schemas';
//
// it('REQ-CONTACT-001 TC-ZO-001: contactSchema validates correct input @p0', () => {
//   const valid = { name: 'Test', type: 'buyer', email: 'test@test.com' };
//   expect(() => contactSchema.parse(valid)).not.toThrow();
// });
//
// it('REQ-CONTACT-001 TC-ZO-002: contactSchema rejects missing name @p0', () => {
//   const invalid = { type: 'buyer' };
//   expect(() => contactSchema.parse(invalid)).toThrow();
// });
