import type { SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * IP Warm-up Governor (A6).
 *
 * When a new Resend sending domain is provisioned, ESPs throttle or reject
 * email from IPs without established reputation. This module enforces a
 * conservative ramp-up schedule so the domain builds sender score gradually.
 *
 * Schedule:
 *   Day  1–3  → max  50 / day
 *   Day  4–7  → max 200 / day
 *   Day  8–14 → max 1 000 / day
 *   Day 15+   → unlimited
 *
 * The warm-up start date is either:
 *   1. The `WARMUP_START_DATE` config variable (ISO 8601 string), or
 *   2. Auto-detected from the earliest `sent_at` in the `newsletters` table.
 *
 * If neither is available (brand-new install with no sends), the governor
 * treats today as day 1 and enforces the strictest tier.
 */

type WarmupResult = {
  allowed: boolean;
  dailySent: number;
  dailyLimit: number;
  warmupDay: number;
};

const TIERS: { maxDay: number; limit: number }[] = [
  { maxDay: 3, limit: 50 },
  { maxDay: 7, limit: 200 },
  { maxDay: 14, limit: 1_000 },
];

function dailyLimitForDay(day: number): number {
  for (const tier of TIERS) {
    if (day <= tier.maxDay) return tier.limit;
  }
  return Infinity; // day 15+: unlimited
}

function daysSince(start: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1_000)));
}

/**
 * Count newsletters with status='sent' whose `sent_at` falls within
 * today (UTC midnight to midnight).
 */
async function countTodaySent(db: SupabaseClient): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await db
    .from('newsletters')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', todayStart.toISOString());

  if (error) {
    logger.error({ err: error }, 'warmup: failed to count today sends');
    // Fail-safe: assume high volume so callers don't accidentally bypass
    return Infinity;
  }

  return count ?? 0;
}

/**
 * Determine when the warm-up period started.
 * Priority: config var → earliest sent newsletter → today.
 */
async function resolveStartDate(db: SupabaseClient): Promise<Date> {
  if (config.WARMUP_START_DATE) {
    const parsed = new Date(config.WARMUP_START_DATE);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    logger.warn({ raw: config.WARMUP_START_DATE }, 'warmup: invalid WARMUP_START_DATE, falling back');
  }

  const { data, error } = await db
    .from('newsletters')
    .select('sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({ err: error }, 'warmup: failed to query first send date');
    return new Date(); // treat today as day 1 (strictest)
  }

  if (data?.sent_at) {
    return new Date(data.sent_at as string);
  }

  return new Date(); // no sends yet — day 1
}

/**
 * Check whether the warm-up governor allows another send right now.
 *
 * The caller decides whether to enforce the result — this function never
 * blocks or throws on its own.
 */
export async function checkWarmupAllowed(db: SupabaseClient): Promise<WarmupResult> {
  const [startDate, dailySent] = await Promise.all([
    resolveStartDate(db),
    countTodaySent(db),
  ]);

  const warmupDay = daysSince(startDate);
  const dailyLimit = dailyLimitForDay(warmupDay);
  const allowed = dailySent < dailyLimit;

  logger.debug(
    { warmupDay, dailySent, dailyLimit, allowed },
    'warmup: check result'
  );

  return { allowed, dailySent, dailyLimit, warmupDay };
}
