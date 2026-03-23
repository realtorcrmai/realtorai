import { logger } from "../logger.js";

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  label: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === options.maxRetries) {
        logger.error(`${options.label} failed after ${options.maxRetries + 1} attempts`);
        throw error;
      }

      // Longer delay for rate limits
      const isRateLimit = error?.status === 429 || error?.message?.includes("rate");
      const multiplier = isRateLimit ? 3 : 1;
      const delay = options.baseDelay * Math.pow(2, attempt) * multiplier + Math.random() * 1000;

      logger.warn(
        `${options.label} failed (attempt ${attempt + 1}/${options.maxRetries + 1}): ${error?.message || error}. Retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}
