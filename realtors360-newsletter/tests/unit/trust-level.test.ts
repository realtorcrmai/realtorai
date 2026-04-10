import { describe, it, expect } from 'vitest';
import { computeTrustLevel } from '../../src/agent/trust/trust-level.js';

/**
 * Tests for the trust level computation (M5-C).
 *
 * Pure function — no DB mocking needed. Locks down the promotion
 * thresholds so changes to trust rules are intentional, not accidental.
 */

describe('computeTrustLevel', () => {
  // L0: default for new contacts
  it('returns L0 for zero signals', () => {
    expect(computeTrustLevel(0, 0, false, false)).toBe(0);
  });

  it('returns L0 for insufficient positive signals', () => {
    expect(computeTrustLevel(2, 0, false, false)).toBe(0);
  });

  it('returns L0 when negatives block promotion', () => {
    expect(computeTrustLevel(5, 1, false, false)).toBe(0);
  });

  // L1: ≥3 positive, 0 negative
  it('returns L1 at exactly 3 positive, 0 negative', () => {
    expect(computeTrustLevel(3, 0, false, false)).toBe(1);
  });

  it('returns L1 at 5 positive, 0 negative (no reply)', () => {
    expect(computeTrustLevel(5, 0, false, false)).toBe(1);
  });

  // L2: ≥10 positive, has reply, ≤1 negative
  it('returns L2 at 10 positive with reply', () => {
    expect(computeTrustLevel(10, 0, true, false)).toBe(2);
  });

  it('returns L2 at 10 positive, 1 negative, with reply', () => {
    expect(computeTrustLevel(10, 1, true, false)).toBe(2);
  });

  it('stays L1 at 10 positive without reply', () => {
    expect(computeTrustLevel(10, 0, false, false)).toBe(1);
  });

  it('stays L0 at 10 positive with reply but 2 negatives (L1 requires 0 negative)', () => {
    expect(computeTrustLevel(10, 2, true, false)).toBe(0);
  });

  // L3: has closed deal + sufficient positive
  it('returns L3 with closed deal and ≥10 positive', () => {
    expect(computeTrustLevel(10, 0, true, true)).toBe(3);
  });

  it('returns L3 with closed deal, 10 positive, 1 negative', () => {
    expect(computeTrustLevel(10, 1, true, true)).toBe(3);
  });

  it('stays L1 with deal but insufficient positive for L2/L3 (edge: 9)', () => {
    // L3 requires deal + ≥10 positive. L2 requires ≥10 + reply. 9 < 10 → L1.
    expect(computeTrustLevel(9, 0, true, true)).toBe(1);
  });

  // Edge cases
  it('returns L0 for very high negatives even with high positives', () => {
    expect(computeTrustLevel(5, 5, false, false)).toBe(0);
  });

  it('returns L3 for maxed out contact', () => {
    expect(computeTrustLevel(100, 0, true, true)).toBe(3);
  });
});
