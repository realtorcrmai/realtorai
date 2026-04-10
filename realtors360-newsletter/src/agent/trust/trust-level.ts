/**
 * Trust Level System — M5-C.
 *
 * Trust levels determine agent autonomy per contact:
 *   L0 (new): ALL emails go to approval queue
 *   L1 (proven): ≥3 successful sends, 0 negatives → low-stakes auto-send
 *   L2 (engaged): ≥10 successful sends, ≥1 reply → most auto-send
 *   L3 (deal): ≥1 closed deal → full auto except legal
 *
 * Promotion is one-way up but CAN be demoted on negative signals
 * (unsubscribe, complaint, bounce). Demotion drops exactly 1 level.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../lib/logger.js';

export type TrustLevel = 0 | 1 | 2 | 3;

export type TrustRecord = {
  contact_id: string;
  realtor_id: string;
  level: TrustLevel;
  positive_signals: number;
  negative_signals: number;
  last_promoted_at: string | null;
};

/** Promotion thresholds */
const THRESHOLDS = {
  L1: { minPositive: 3, maxNegative: 0 },
  L2: { minPositive: 10, minReplies: 1 },
  L3: { requiresDeal: true },
} as const;

/**
 * Compute what trust level a contact SHOULD be at, given their signals.
 * Pure function — no DB. Fully testable.
 */
export function computeTrustLevel(
  positive: number,
  negative: number,
  hasReply: boolean,
  hasClosedDeal: boolean
): TrustLevel {
  if (hasClosedDeal && positive >= THRESHOLDS.L2.minPositive) return 3;
  if (positive >= THRESHOLDS.L2.minPositive && hasReply && negative <= 1) return 2;
  if (positive >= THRESHOLDS.L1.minPositive && negative <= THRESHOLDS.L1.maxNegative) return 1;
  return 0;
}

/**
 * Record a positive signal (open, click, reply) and potentially promote.
 */
export async function recordPositiveSignal(
  db: SupabaseClient,
  realtorId: string,
  contactId: string,
  signalType: 'open' | 'click' | 'reply'
): Promise<{ newLevel: TrustLevel; promoted: boolean }> {
  // Upsert trust record
  const { data: existing } = await db
    .from('contact_trust_levels')
    .select('*')
    .eq('contact_id', contactId)
    .eq('realtor_id', realtorId)
    .maybeSingle();

  const currentLevel = (existing?.level ?? 0) as TrustLevel;
  const currentPositive = (existing?.positive_signals ?? 0) + 1;
  const currentNegative = existing?.negative_signals ?? 0;
  const hasReply = signalType === 'reply' || currentPositive >= 10; // approximate

  // Check for deal (simplified — check if contact has any deal with status 'closed')
  const { count: dealCount } = await db
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('contact_id', contactId)
    .eq('status', 'closed');

  const hasClosedDeal = (dealCount ?? 0) > 0;
  const computedLevel = computeTrustLevel(currentPositive, currentNegative, hasReply, hasClosedDeal);
  const newLevel = Math.max(currentLevel, computedLevel) as TrustLevel; // never auto-demote on positive
  const promoted = newLevel > currentLevel;

  if (existing) {
    await db.from('contact_trust_levels').update({
      positive_signals: currentPositive,
      level: newLevel,
      last_promoted_at: promoted ? new Date().toISOString() : existing.last_promoted_at,
      updated_at: new Date().toISOString(),
    }).eq('contact_id', contactId).eq('realtor_id', realtorId);
  } else {
    await db.from('contact_trust_levels').insert({
      realtor_id: realtorId,
      contact_id: contactId,
      level: newLevel,
      positive_signals: currentPositive,
      negative_signals: 0,
      last_promoted_at: promoted ? new Date().toISOString() : null,
    });
  }

  if (promoted) {
    logger.info({ contactId, from: currentLevel, to: newLevel, signal: signalType }, 'trust: promoted');
  }

  return { newLevel, promoted };
}

/**
 * Record a negative signal (unsubscribe, complaint, bounce) and potentially demote.
 * Demotion drops exactly 1 level (never more) to avoid trust oscillation.
 */
export async function recordNegativeSignal(
  db: SupabaseClient,
  realtorId: string,
  contactId: string,
  signalType: 'unsubscribe' | 'complaint' | 'bounce'
): Promise<{ newLevel: TrustLevel; demoted: boolean }> {
  const { data: existing } = await db
    .from('contact_trust_levels')
    .select('*')
    .eq('contact_id', contactId)
    .eq('realtor_id', realtorId)
    .maybeSingle();

  const currentLevel = (existing?.level ?? 0) as TrustLevel;
  const newLevel = Math.max(0, currentLevel - 1) as TrustLevel;
  const demoted = newLevel < currentLevel;

  if (existing) {
    await db.from('contact_trust_levels').update({
      negative_signals: (existing.negative_signals ?? 0) + 1,
      level: newLevel,
      updated_at: new Date().toISOString(),
    }).eq('contact_id', contactId).eq('realtor_id', realtorId);
  } else {
    await db.from('contact_trust_levels').insert({
      realtor_id: realtorId,
      contact_id: contactId,
      level: 0,
      positive_signals: 0,
      negative_signals: 1,
    });
  }

  if (demoted) {
    logger.warn({ contactId, from: currentLevel, to: newLevel, signal: signalType }, 'trust: demoted');
  }

  return { newLevel, demoted };
}
