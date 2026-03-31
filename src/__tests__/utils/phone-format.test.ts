/**
 * Tests for phone number formatting logic from src/lib/twilio.ts
 *
 * The formatNumber function in twilio.ts is module-private, so we replicate
 * the exact logic here for isolated unit testing. The function:
 *   1. Strips all non-digit characters
 *   2. If the result starts with "1", prepend "+"
 *   3. Otherwise prepend "+1"
 *   4. For WhatsApp, prefix with "whatsapp:"
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ═══════════════════════════════════════════════
// Replicate the exact formatNumber logic from twilio.ts
// ═══════════════════════════════════════════════

type Channel = 'whatsapp' | 'sms';

function formatNumber(phone: string, channel: Channel): string {
  const clean = phone.replace(/\D/g, '');
  const e164 = clean.startsWith('1') ? `+${clean}` : `+1${clean}`;
  return channel === 'whatsapp' ? `whatsapp:${e164}` : e164;
}

// ═══════════════════════════════════════════════
// SMS formatting
// ═══════════════════════════════════════════════

describe('formatNumber — SMS', () => {
  it('adds +1 to a raw 10-digit number', () => {
    expect(formatNumber('6045551234', 'sms')).toBe('+16045551234');
  });

  it('handles number already starting with 1 (11 digits)', () => {
    expect(formatNumber('16045551234', 'sms')).toBe('+16045551234');
  });

  it('handles number with +1 prefix already', () => {
    // +1 is stripped to 16045551234 by \D removal
    expect(formatNumber('+16045551234', 'sms')).toBe('+16045551234');
  });

  it('strips spaces from number', () => {
    expect(formatNumber('604 555 1234', 'sms')).toBe('+16045551234');
  });

  it('strips dashes from number', () => {
    expect(formatNumber('604-555-1234', 'sms')).toBe('+16045551234');
  });

  it('strips parentheses and dots', () => {
    expect(formatNumber('(604) 555.1234', 'sms')).toBe('+16045551234');
  });

  it('handles number with country code and formatting', () => {
    expect(formatNumber('+1 (604) 555-1234', 'sms')).toBe('+16045551234');
  });

  it('handles empty string', () => {
    // Empty string has no digits, so clean is "", doesn't start with "1"
    expect(formatNumber('', 'sms')).toBe('+1');
  });

  it('handles string with no digits', () => {
    expect(formatNumber('no-digits-here!', 'sms')).toBe('+1');
  });

  it('handles very short number', () => {
    expect(formatNumber('123', 'sms')).toBe('+123');
  });
});

// ═══════════════════════════════════════════════
// WhatsApp formatting
// ═══════════════════════════════════════════════

describe('formatNumber — WhatsApp', () => {
  it('adds whatsapp: prefix to 10-digit number', () => {
    expect(formatNumber('6045551234', 'whatsapp')).toBe('whatsapp:+16045551234');
  });

  it('adds whatsapp: prefix to already-formatted number', () => {
    expect(formatNumber('+16045551234', 'whatsapp')).toBe('whatsapp:+16045551234');
  });

  it('strips formatting and adds whatsapp prefix', () => {
    expect(formatNumber('(604) 555-1234', 'whatsapp')).toBe('whatsapp:+16045551234');
  });

  it('handles 11-digit number starting with 1', () => {
    expect(formatNumber('16045551234', 'whatsapp')).toBe('whatsapp:+16045551234');
  });
});

// ═══════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════

describe('formatNumber — edge cases', () => {
  it('handles number with leading/trailing whitespace', () => {
    expect(formatNumber('  6045551234  ', 'sms')).toBe('+16045551234');
  });

  it('handles number with mixed formatting', () => {
    expect(formatNumber('+1.604.555.1234', 'sms')).toBe('+16045551234');
  });

  it('handles tab characters', () => {
    expect(formatNumber('604\t555\t1234', 'sms')).toBe('+16045551234');
  });

  it('handles newline characters', () => {
    expect(formatNumber('604\n555\n1234', 'sms')).toBe('+16045551234');
  });
});

// ═══════════════════════════════════════════════
// Property-based tests (fast-check)
// ═══════════════════════════════════════════════

describe('formatNumber property tests', () => {
  it('10-digit numeric strings always produce valid +1XXXXXXXXXX format', () => {
    // Generate 10-digit strings that don't start with 1
    fc.assert(
      fc.property(
        fc.stringMatching(/^[2-9]\d{9}$/),
        (digits) => {
          const result = formatNumber(digits, 'sms');
          expect(result).toBe(`+1${digits}`);
          expect(result).toMatch(/^\+1\d{10}$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('11-digit strings starting with 1 produce +1XXXXXXXXXX format', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^1[2-9]\d{9}$/),
        (digits) => {
          const result = formatNumber(digits, 'sms');
          expect(result).toBe(`+${digits}`);
          expect(result).toMatch(/^\+1\d{10}$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('SMS result always starts with +', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 30 }),
        (phone) => {
          const result = formatNumber(phone, 'sms');
          expect(result.startsWith('+')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('WhatsApp result always starts with whatsapp:+', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 30 }),
        (phone) => {
          const result = formatNumber(phone, 'whatsapp');
          expect(result.startsWith('whatsapp:+')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('formatting is idempotent on the digit extraction', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 30 }),
        (phone) => {
          const firstPass = formatNumber(phone, 'sms');
          const secondPass = formatNumber(firstPass, 'sms');
          // After first pass, + is stripped leaving 1XXXX, then gets +
          // Should stabilize: both should resolve to same digits
          const digits1 = firstPass.replace(/\D/g, '');
          const digits2 = secondPass.replace(/\D/g, '');
          expect(digits1).toBe(digits2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-digit characters in input do not appear in output digits', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 30 }),
        (phone) => {
          const result = formatNumber(phone, 'sms');
          // Remove the leading + and check only digits remain
          const afterPlus = result.slice(1);
          expect(afterPlus).toMatch(/^\d*$/);
        },
      ),
      { numRuns: 100 },
    );
  });
});
