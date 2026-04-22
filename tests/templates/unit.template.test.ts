/**
 * Unit Test Template — Zod Schema Validator
 * REQ-CONTACT-001: Contact creation validation
 *
 * Tests the Zod schema used by ContactForm and createContact server action.
 * Demonstrates: REQ-ID format, edge cases, boundary values, error messages.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// === Schema Under Test ===
// In real usage, import from: import { contactSchema } from '@/lib/validators/contact';
// Inline here as template example:

const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be under 200 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?1?\d{10,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  type: z.enum(['buyer', 'seller', 'both'], {
    errorMap: () => ({ message: 'Type must be buyer, seller, or both' }),
  }),
  pref_channel: z
    .enum(['sms', 'whatsapp', 'email'])
    .default('sms'),
  notes: z
    .string()
    .max(5000, 'Notes must be under 5000 characters')
    .optional(),
  casl_consent_given: z.boolean().default(false),
  casl_consent_date: z.string().datetime().nullable().optional(),
});

type ContactInput = z.infer<typeof contactSchema>;

// === Tests ===

describe('REQ-CONTACT-001: Contact schema validation', () => {
  // --- Happy Path ---

  it('TC-CON-001: valid buyer contact with all fields @P0', () => {
    const input: ContactInput = {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+16045551234',
      type: 'buyer',
      pref_channel: 'sms',
      notes: 'Looking for 3BR in Kitsilano',
      casl_consent_given: true,
      casl_consent_date: '2026-01-15T00:00:00Z',
    };

    const result = contactSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Alice Johnson');
      expect(result.data.type).toBe('buyer');
      expect(result.data.casl_consent_given).toBe(true);
    }
  });

  it('TC-CON-002: valid seller contact with minimal fields @P0', () => {
    const input = {
      name: 'Bob Smith',
      type: 'seller',
    };

    const result = contactSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pref_channel).toBe('sms'); // default
      expect(result.data.casl_consent_given).toBe(false); // default
    }
  });

  it('TC-CON-003: valid contact type "both" @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Carol Lee',
      type: 'both',
      email: 'carol@example.com',
    });
    expect(result.success).toBe(true);
  });

  // --- Required Field Validation ---

  it('TC-CON-004: missing name returns error @P0', () => {
    const result = contactSchema.safeParse({
      type: 'buyer',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.error.issues.find((i) => i.path.includes('name'));
      expect(nameError).toBeDefined();
    }
  });

  it('TC-CON-005: empty name string returns error @P0', () => {
    const result = contactSchema.safeParse({
      name: '',
      type: 'buyer',
    });
    expect(result.success).toBe(false);
  });

  it('TC-CON-006: whitespace-only name returns error @P0', () => {
    const result = contactSchema.safeParse({
      name: '   ',
      type: 'buyer',
    });
    // After trim(), becomes empty string — should fail min(1)
    expect(result.success).toBe(false);
  });

  it('TC-CON-007: missing type returns error @P0', () => {
    const result = contactSchema.safeParse({
      name: 'Dave Jones',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const typeError = result.error.issues.find((i) => i.path.includes('type'));
      expect(typeError).toBeDefined();
    }
  });

  // --- Email Validation ---

  it('TC-CON-008: valid email accepted @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      email: 'user@domain.com',
    });
    expect(result.success).toBe(true);
  });

  it('TC-CON-009: invalid email rejected @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('TC-CON-010: empty email accepted (optional) @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      email: '',
    });
    expect(result.success).toBe(true);
  });

  // --- Phone Validation ---

  it('TC-CON-011: valid phone with +1 prefix @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      phone: '+16045551234',
    });
    expect(result.success).toBe(true);
  });

  it('TC-CON-012: valid phone without prefix @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      phone: '6045551234',
    });
    expect(result.success).toBe(true);
  });

  it('TC-CON-013: invalid phone (too short) @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      phone: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('TC-CON-014: phone with letters rejected @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      phone: '+1604ABC1234',
    });
    expect(result.success).toBe(false);
  });

  // --- Type Enum Validation ---

  it('TC-CON-015: invalid type rejected @P0', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'investor', // not in enum
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0]?.message;
      expect(msg).toBe('Type must be buyer, seller, or both');
    }
  });

  // --- Preferred Channel ---

  it('TC-CON-016: all pref_channel values accepted @P1', () => {
    for (const channel of ['sms', 'whatsapp', 'email'] as const) {
      const result = contactSchema.safeParse({
        name: 'Test',
        type: 'buyer',
        pref_channel: channel,
      });
      expect(result.success).toBe(true);
    }
  });

  it('TC-CON-017: invalid pref_channel rejected @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      pref_channel: 'telegram',
    });
    expect(result.success).toBe(false);
  });

  // --- Boundary Values ---

  it('TC-CON-018: name at max length (200 chars) @P2', () => {
    const result = contactSchema.safeParse({
      name: 'A'.repeat(200),
      type: 'buyer',
    });
    expect(result.success).toBe(true);
  });

  it('TC-CON-019: name exceeds max length @P2', () => {
    const result = contactSchema.safeParse({
      name: 'A'.repeat(201),
      type: 'buyer',
    });
    expect(result.success).toBe(false);
  });

  it('TC-CON-020: notes at max length (5000 chars) @P2', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      notes: 'A'.repeat(5000),
    });
    expect(result.success).toBe(true);
  });

  it('TC-CON-021: notes exceeds max length @P2', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      notes: 'A'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  // --- CASL Consent ---

  it('TC-CON-022: CASL consent with valid datetime @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      casl_consent_given: true,
      casl_consent_date: '2026-04-20T10:30:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('TC-CON-023: CASL consent date null when not given @P1', () => {
    const result = contactSchema.safeParse({
      name: 'Test',
      type: 'buyer',
      casl_consent_given: false,
      casl_consent_date: null,
    });
    expect(result.success).toBe(true);
  });
});
