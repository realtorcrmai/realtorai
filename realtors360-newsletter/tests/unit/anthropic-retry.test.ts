import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { createWithRetry } from '../../src/shared/anthropic-retry.js';

/**
 * Tests for the ported anthropic retry helper. The CRM original has zero
 * tests; we add baseline behaviour coverage as part of M3-A.
 */

function makeMockAnthropic(impl: () => Promise<Anthropic.Message>): Anthropic {
  return {
    messages: { create: vi.fn(impl) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const fakeMessage = { id: 'msg_1', content: [] } as unknown as Anthropic.Message;
const params = {} as Anthropic.MessageCreateParamsNonStreaming;

describe('createWithRetry', () => {
  it('returns immediately on success', async () => {
    const anthropic = makeMockAnthropic(async () => fakeMessage);
    const result = await createWithRetry(anthropic, params);
    expect(result).toBe(fakeMessage);
    expect(anthropic.messages.create).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 then succeeds', async () => {
    let calls = 0;
    const anthropic = makeMockAnthropic(async () => {
      calls++;
      if (calls === 1) {
        const err = new Error('rate limited') as Error & { status: number };
        err.status = 429;
        throw err;
      }
      return fakeMessage;
    });
    const result = await createWithRetry(anthropic, params);
    expect(result).toBe(fakeMessage);
    expect(anthropic.messages.create).toHaveBeenCalledTimes(2);
  }, 10_000);

  it('does not retry on 400', async () => {
    const anthropic = makeMockAnthropic(async () => {
      const err = new Error('bad request') as Error & { status: number };
      err.status = 400;
      throw err;
    });
    await expect(createWithRetry(anthropic, params)).rejects.toThrow('bad request');
    expect(anthropic.messages.create).toHaveBeenCalledTimes(1);
  });

  it('throws after max retries on persistent 529', async () => {
    const anthropic = makeMockAnthropic(async () => {
      const err = new Error('overloaded') as Error & { status: number };
      err.status = 529;
      throw err;
    });
    await expect(createWithRetry(anthropic, params)).rejects.toThrow('overloaded');
    // 1 initial + 3 retries = 4 calls
    expect(anthropic.messages.create).toHaveBeenCalledTimes(4);
  }, 30_000);

  it('reads status from nested error.status', async () => {
    let calls = 0;
    const anthropic = makeMockAnthropic(async () => {
      calls++;
      if (calls === 1) {
        const err = new Error('nested') as Error & { error: { status: number } };
        err.error = { status: 500 };
        throw err;
      }
      return fakeMessage;
    });
    const result = await createWithRetry(anthropic, params);
    expect(result).toBe(fakeMessage);
    expect(anthropic.messages.create).toHaveBeenCalledTimes(2);
  }, 10_000);
});
