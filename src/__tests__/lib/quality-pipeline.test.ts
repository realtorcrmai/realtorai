/**
 * REQ-NEWSLETTER L1 Unit Tests: quality-pipeline.ts — makeQualityDecision
 *
 * Tests the pure decision engine that maps a QualityScore to a send/block
 * action. No DB, no AI calls — pure logic only.
 *
 * Note: Fix 4 in the source means scores below threshold return action 'send'
 * (not 'regenerate') because there is no retry loop in any caller.
 */

import { describe, it, expect } from 'vitest';
import { makeQualityDecision, type QualityScore } from '@/lib/quality-pipeline';

// ═══════════════════════════════════════════════
// HELPERS — minimal QualityScore factory
// ═══════════════════════════════════════════════

function makeScore(overrides: Partial<QualityScore> = {}): QualityScore {
  return {
    overall: 7.5,
    dimensions: {
      personalization: 8,
      relevance: 7,
      dataAccuracy: 8,
      toneMatch: 7,
      ctaClarity: 8,
      length: 7,
      uniqueness: 8,
    },
    feedback: 'Good quality email',
    suggestions: [],
    shouldRegenerate: false,
    shouldBlock: false,
    ...overrides,
  };
}

describe('makeQualityDecision', () => {
  it('REQ-NEWSLETTER TC-QD-001: blocks when shouldBlock is true @p0', () => {
    const score = makeScore({ shouldBlock: true, overall: 3.0 });

    const decision = makeQualityDecision(score);

    expect(decision.action).toBe('block');
    expect(decision.score).toBe(3.0);
    expect(decision.reason).toContain('Quality too low');
  });

  it('REQ-NEWSLETTER TC-QD-002: sends normally when score >= 6 and no flags @p0', () => {
    const score = makeScore({ overall: 7.5, shouldRegenerate: false, shouldBlock: false });

    const decision = makeQualityDecision(score);

    expect(decision.action).toBe('send');
    expect(decision.reason).toContain('Quality approved');
    expect(decision.score).toBe(7.5);
  });

  it('REQ-NEWSLETTER TC-QD-003: sends with warning when shouldRegenerate is true @p1', () => {
    const score = makeScore({ overall: 5.5, shouldRegenerate: true, shouldBlock: false });

    const decision = makeQualityDecision(score);

    // Fix 4: returns 'send' not 'regenerate' (no retry loop in callers)
    expect(decision.action).toBe('send');
    expect(decision.reason).toContain('below threshold');
  });

  it('REQ-NEWSLETTER TC-QD-004: sends with warning when overall < minScore @p1', () => {
    const score = makeScore({ overall: 5.0, shouldRegenerate: false, shouldBlock: false });

    const decision = makeQualityDecision(score);

    expect(decision.action).toBe('send');
    expect(decision.reason).toContain('below threshold');
    expect(decision.reason).toContain('5');
  });

  it('REQ-NEWSLETTER TC-QD-005: respects custom minScore override @p1', () => {
    const score = makeScore({ overall: 7.0, shouldRegenerate: false, shouldBlock: false });

    // Default minScore is 6, but we set it to 8
    const decision = makeQualityDecision(score, 8);

    expect(decision.action).toBe('send');
    expect(decision.reason).toContain('below threshold');
    expect(decision.reason).toContain('8');
  });

  it('REQ-NEWSLETTER TC-QD-006: block takes priority over regenerate @p0', () => {
    const score = makeScore({
      overall: 2.0,
      shouldBlock: true,
      shouldRegenerate: true,
    });

    const decision = makeQualityDecision(score);

    expect(decision.action).toBe('block');
    expect(decision.reason).toContain('Quality too low');
  });

  it('REQ-NEWSLETTER TC-QD-007: handles edge case overall = exactly minScore @p2', () => {
    const score = makeScore({ overall: 6.0, shouldRegenerate: false, shouldBlock: false });

    const decision = makeQualityDecision(score);

    // 6.0 is NOT < 6, so it should pass as approved
    expect(decision.action).toBe('send');
    expect(decision.reason).toContain('Quality approved');
  });

  it('REQ-NEWSLETTER TC-QD-008: attaches full qualityScore to decision @p2', () => {
    const score = makeScore();

    const decision = makeQualityDecision(score);

    expect(decision.qualityScore).toBe(score);
    expect(decision.qualityScore.dimensions.personalization).toBe(8);
  });

  it('REQ-NEWSLETTER TC-QD-009: includes suggestions in reason when below threshold @p2', () => {
    const score = makeScore({
      overall: 4.5,
      shouldRegenerate: true,
      shouldBlock: false,
      suggestions: ['Improve personalization', 'Add area-specific data'],
    });

    const decision = makeQualityDecision(score);

    expect(decision.reason).toContain('Improve personalization');
    expect(decision.reason).toContain('Add area-specific data');
  });
});
