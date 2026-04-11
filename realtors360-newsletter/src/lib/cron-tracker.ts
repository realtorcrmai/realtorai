/**
 * In-memory cron execution tracker.
 *
 * Each cron calls `recordCronRun(name, durationMs, ok)` after completion.
 * The health and metrics endpoints read `getCronStatus()` to surface last
 * execution time, duration, and success/failure state.
 *
 * Data is ephemeral — resets on process restart. This is intentional:
 * the tracker answers "is the cron running *right now*?", not "has it
 * ever run?". For historical data, query `email_events` or `agent_runs`.
 */

export type CronRunInfo = {
  lastRun: string;       // ISO 8601
  durationMs: number;
  ok: boolean;
  error?: string;
  runCount: number;
  failCount: number;
};

const cronStatus: Record<string, CronRunInfo> = {};

export function recordCronRun(
  name: string,
  durationMs: number,
  ok: boolean,
  error?: string
): void {
  const existing = cronStatus[name];
  cronStatus[name] = {
    lastRun: new Date().toISOString(),
    durationMs,
    ok,
    error: ok ? undefined : error,
    runCount: (existing?.runCount ?? 0) + 1,
    failCount: (existing?.failCount ?? 0) + (ok ? 0 : 1),
  };
}

export function getCronStatus(): Record<string, CronRunInfo> {
  return { ...cronStatus };
}
