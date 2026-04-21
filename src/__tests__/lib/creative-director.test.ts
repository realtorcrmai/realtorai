/**
 * REQ-AI L1 Unit Tests: creative-director.ts — generateMLSRemarks
 *
 * Tests the MLS remarks generator which calls Claude Sonnet via the
 * Anthropic SDK. All SDK calls are mocked — no real API traffic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted ensures mockCreate is available when the vi.mock factory runs
// (vi.mock is hoisted above all other statements by vitest).
// ---------------------------------------------------------------------------
const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return { mockCreate };
});

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
      constructor() {}
    },
  };
});

// Mock the retry wrapper to just forward to the SDK
vi.mock('@/lib/anthropic/retry', () => ({
  createWithRetry: vi.fn(
    (client: { messages: { create: Function } }, params: unknown) =>
      client.messages.create(params)
  ),
}));

import { generateMLSRemarks } from '@/lib/anthropic/creative-director';

const SAMPLE_LISTING = {
  address: '1234 Main St, Vancouver, BC',
  listPrice: 1500000,
  bedrooms: 4,
  bathrooms: 3,
  sqft: 2800,
  yearBuilt: 2015,
  features: 'Chef kitchen, hardwood floors, mountain views',
  showingInstructions: 'By appointment only. 24h notice required.',
};

function makeClaudeResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  };
}

beforeEach(() => {
  mockCreate.mockReset();
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
});

describe('generateMLSRemarks', () => {
  it('REQ-AI-001 TC-MR-001: Returns parsed publicRemarks and realtorRemarks from Claude response @p0', async () => {
    const json = JSON.stringify({
      publicRemarks: 'Beautiful 4-bed home in Vancouver.',
      realtorRemarks: 'Showing by appointment. 24h notice.',
    });
    mockCreate.mockResolvedValueOnce(makeClaudeResponse(json));

    const result = await generateMLSRemarks(SAMPLE_LISTING);

    expect(result.publicRemarks).toBe('Beautiful 4-bed home in Vancouver.');
    expect(result.realtorRemarks).toBe('Showing by appointment. 24h notice.');
  });

  it('REQ-AI-002 TC-MR-002: Caps publicRemarks at 500 characters @p0', async () => {
    const longPublic = 'A'.repeat(600);
    const json = JSON.stringify({
      publicRemarks: longPublic,
      realtorRemarks: 'Short.',
    });
    mockCreate.mockResolvedValueOnce(makeClaudeResponse(json));

    const result = await generateMLSRemarks(SAMPLE_LISTING);

    expect(result.publicRemarks).toHaveLength(500);
    expect(result.realtorRemarks).toBe('Short.');
  });

  it('REQ-AI-003 TC-MR-003: Caps realtorRemarks at 500 characters @p0', async () => {
    const longRealtor = 'B'.repeat(700);
    const json = JSON.stringify({
      publicRemarks: 'Normal.',
      realtorRemarks: longRealtor,
    });
    mockCreate.mockResolvedValueOnce(makeClaudeResponse(json));

    const result = await generateMLSRemarks(SAMPLE_LISTING);

    expect(result.publicRemarks).toBe('Normal.');
    expect(result.realtorRemarks).toHaveLength(500);
  });

  it('REQ-AI-004 TC-MR-004: Handles JSON parse error gracefully (fallback) @p1', async () => {
    const garbledText = 'This is not valid JSON at all, just plain text from Claude.';
    mockCreate.mockResolvedValueOnce(makeClaudeResponse(garbledText));

    const result = await generateMLSRemarks(SAMPLE_LISTING);

    expect(result.publicRemarks).toBe(garbledText);
    expect(result.realtorRemarks).toBe('');
  });

  it('REQ-AI-005 TC-MR-005: Passes listing context fields to Claude prompt @p1', async () => {
    const json = JSON.stringify({
      publicRemarks: 'Test.',
      realtorRemarks: 'Test.',
    });
    mockCreate.mockResolvedValueOnce(makeClaudeResponse(json));

    await generateMLSRemarks(SAMPLE_LISTING);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];

    // The user message should contain the listing JSON
    const userContent = callArgs.messages[0].content;
    expect(userContent).toContain('1234 Main St, Vancouver, BC');
    expect(userContent).toContain('1500000');
    expect(userContent).toContain('Chef kitchen');

    // System prompt should mention 500 char limit
    expect(callArgs.system).toContain('500');
  });
});
