import { logger } from './logger.js';

/**
 * A4: Simple 3-state circuit breaker for external API calls.
 *
 * States: CLOSED (normal) → OPEN (failing, reject fast) → HALF_OPEN (probe).
 *
 * - CLOSED: all calls pass through. After `failureThreshold` consecutive
 *   failures, transitions to OPEN.
 * - OPEN: all calls immediately throw CircuitOpenError. After `resetTimeoutMs`,
 *   transitions to HALF_OPEN.
 * - HALF_OPEN: the next call passes through as a probe. If it succeeds,
 *   transitions to CLOSED. If it fails, transitions back to OPEN.
 *
 * Usage:
 *   const breaker = new CircuitBreaker('anthropic', { failureThreshold: 3 });
 *   const result = await breaker.call(() => anthropic.messages.create(...));
 */

export class CircuitOpenError extends Error {
  public readonly service: string;
  constructor(service: string) {
    super(`Circuit breaker OPEN for ${service} — rejecting call`);
    this.name = 'CircuitOpenError';
    this.service = service;
  }
}

type State = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;   // consecutive failures before opening (default 5)
  resetTimeoutMs?: number;     // ms in OPEN state before probing (default 30_000)
  name?: string;               // label for logs
}

export class CircuitBreaker {
  private state: State = 'closed';
  private failures = 0;
  private lastFailureAt = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly name: string;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureAt >= this.resetTimeoutMs) {
        this.state = 'half_open';
        logger.info({ breaker: this.name }, 'circuit-breaker: transitioning to HALF_OPEN');
      } else {
        throw new CircuitOpenError(this.name);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half_open') {
      logger.info({ breaker: this.name }, 'circuit-breaker: probe succeeded, closing');
    }
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureAt = Date.now();

    if (this.state === 'half_open') {
      this.state = 'open';
      logger.warn({ breaker: this.name }, 'circuit-breaker: probe failed, reopening');
      return;
    }

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      logger.error(
        { breaker: this.name, failures: this.failures },
        'circuit-breaker: threshold reached, OPENING'
      );
    }
  }

  getState(): State {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

// Shared instances for the three external services.
export const anthropicBreaker = new CircuitBreaker('anthropic', {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
});

export const resendBreaker = new CircuitBreaker('resend', {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
});

export const voyageBreaker = new CircuitBreaker('voyage', {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
});
