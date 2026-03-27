// ============================================================
// Anthropic API retry wrapper with exponential backoff
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

const RETRYABLE_STATUS_CODES = [429, 500, 529];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * Wraps anthropic.messages.create() with exponential backoff retry.
 * Retries on 429 (rate limit), 500 (server error), 529 (overloaded).
 * All other errors are thrown immediately.
 */
export async function createWithRetry(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming
): Promise<Anthropic.Message> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err: unknown) {
      lastError = err;

      // Check if retryable
      const status = (err as any)?.status ?? (err as any)?.error?.status;
      if (!RETRYABLE_STATUS_CODES.includes(status) || attempt === MAX_RETRIES) {
        throw err;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[anthropic-retry] Attempt ${attempt + 1}/${MAX_RETRIES} failed (status ${status}), retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
