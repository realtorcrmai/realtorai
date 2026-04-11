import crypto from 'node:crypto';

/**
 * Generate a short trace ID for correlating log lines across a single
 * agent run or pipeline execution. 8 hex chars = 4 billion combinations,
 * more than enough for per-process uniqueness.
 *
 * Usage: grep for `traceId=abc12def` to see every log line from one
 * email's journey — from event intake through AI generation to send.
 */
export function generateTraceId(): string {
  return crypto.randomUUID().slice(0, 8);
}
