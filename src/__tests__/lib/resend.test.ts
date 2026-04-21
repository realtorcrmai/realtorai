/**
 * REQ-EMAIL L1 Unit Tests: resend.ts — sendEmail / sendWithRetry
 *
 * Tests retry logic, dev-mode capture, and error handling for the Resend
 * email wrapper. All Resend SDK calls are mocked — no real API traffic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted ensures mockSend is available when vi.mock factory runs
// ---------------------------------------------------------------------------
const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn();
  return { mockSend };
});

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSend };
    constructor() {}
  },
}));

// Mock the unsubscribe-token helper (imported by resend.ts)
vi.mock('@/lib/unsubscribe-token', () => ({
  buildUnsubscribeUrl: vi.fn((contactId: string) =>
    `https://app.test/api/newsletters/unsubscribe?token=${contactId}`
  ),
}));

// Set env vars before module import
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.RESEND_FROM_EMAIL = 'test@example.com';
process.env.NEXT_PUBLIC_APP_URL = 'https://app.test';
process.env.NODE_ENV = 'test';

import { sendEmail } from '@/lib/resend';

const VALID_PARAMS = {
  to: 'buyer@example.com',
  subject: 'New Listing Alert',
  html: '<p>Check out this listing</p>',
};

describe('sendEmail — retry logic and error handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSend.mockReset();
    delete process.env.DEV_EMAIL_MODE;
    delete process.env.EMAIL_MONITOR_BCC;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('REQ-EMAIL-001 TC-RE-001: Successful send returns messageId @p0', async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: 'msg_abc123' },
      error: null,
    });

    const result = await sendEmail(VALID_PARAMS);

    expect(result).toEqual({ messageId: 'msg_abc123' });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('REQ-EMAIL-002 TC-RE-002: Retries on 429 rate limit and eventually succeeds @p0', async () => {
    const rateLimitError = { statusCode: 429, message: 'Rate limited' };
    mockSend
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ data: { id: 'msg_retry_ok' }, error: null });

    const promise = sendEmail(VALID_PARAMS);

    // Advance through the two retry delays (1s, 2s)
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toEqual({ messageId: 'msg_retry_ok' });
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('REQ-EMAIL-003 TC-RE-003: Retries on 503 server error @p1', async () => {
    const serverError = { statusCode: 503, message: 'Service Unavailable' };
    mockSend
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({ data: { id: 'msg_503_ok' }, error: null });

    const promise = sendEmail(VALID_PARAMS);

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toEqual({ messageId: 'msg_503_ok' });
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('REQ-EMAIL-004 TC-RE-004: Does NOT retry on 400 client error @p0', async () => {
    const clientError = { statusCode: 400, message: 'Bad Request' };
    mockSend.mockRejectedValueOnce(clientError);

    await expect(sendEmail(VALID_PARAMS)).rejects.toEqual(clientError);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('REQ-EMAIL-005 TC-RE-005: Throws after max retries exhausted @p1', async () => {
    const rateLimitError = { statusCode: 429, message: 'Rate limited' };
    mockSend
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError);

    // Attach .catch early to prevent unhandled rejection warnings
    let caughtError: unknown;
    const promise = sendEmail(VALID_PARAMS).catch((e) => {
      caughtError = e;
    });

    // Advance through all 3 retry delays (1s, 2s, 4s)
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    await promise;
    expect(caughtError).toEqual(rateLimitError);
    // 1 initial + 3 retries = 4 calls
    expect(mockSend).toHaveBeenCalledTimes(4);
  });
});
