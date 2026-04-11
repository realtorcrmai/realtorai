import type Anthropic from '@anthropic-ai/sdk';
import { logger } from '../lib/logger.js';

/**
 * Anthropic API retry wrapper with exponential backoff.
 *
 * Ported from `realestate-crm/src/lib/anthropic/retry.ts` (M3-A batch 1).
 * Behaviour preserved exactly: 3 retries on 429/500/529, exponential backoff
 * 1s → 2s → 4s. Tightened to remove `any` casts (HC-1).
 *
 * Used by:
 *   - process-workflows (per AI step)
 *   - agent-scoring (per contact)
 *   - newsletter orchestrator (M2 — could adopt this, currently calls
 *     anthropic.messages.create directly)
 */

const RETRYABLE_STATUS_CODES = new Set([429, 500, 529]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/** Anthropic SDK errors expose `status` directly or nested under `error.status` */
type MaybeStatusError = {
  status?: number;
  error?: { status?: number };
};

function extractStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const e = err as MaybeStatusError;
  return e.status ?? e.error?.status;
}

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

      const status = extractStatus(err);
      const isLastAttempt = attempt === MAX_RETRIES;
      const isRetryable = status !== undefined && RETRYABLE_STATUS_CODES.has(status);

      if (!isRetryable || isLastAttempt) {
        throw err;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      logger.warn(
        { attempt: attempt + 1, max: MAX_RETRIES, status, delay_ms: delay },
        'anthropic-retry: retrying'
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
