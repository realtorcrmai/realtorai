import * as Sentry from '@sentry/node';
import { config } from '../config.js';
import { logger } from './logger.js';

let initialised = false;

/**
 * Initialise Sentry error tracking.
 *
 * No-op when `SENTRY_DSN` is not configured — this keeps the dependency
 * optional so local dev and CI don't need a Sentry project.
 */
export function initSentry(): void {
  if (initialised) return;
  initialised = true;

  if (!config.SENTRY_DSN) {
    logger.info('sentry: SENTRY_DSN not set — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: 0.1,
  });

  logger.info('sentry: initialised');
}

/**
 * Capture an exception in Sentry with optional structured context.
 *
 * Safe to call even when Sentry is not initialised — the Sentry SDK
 * silently drops events when no DSN is configured.
 */
export function captureException(
  err: Error,
  context?: Record<string, unknown>
): void {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}
