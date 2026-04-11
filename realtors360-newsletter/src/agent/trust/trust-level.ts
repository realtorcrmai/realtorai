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
 *
 * Uses an atomic Postgres function (088_trust_level_atomic.sql) to avoid
 * TOCTOU race conditions — the increment and level recomputation happen
 * in a single transaction with a row-level lock.
 */
export async function recordPositiveSignal(
  db: SupabaseClient,
  realtorId: string,
  contactId: string,
  signalType: 'open' | 'click' | 'reply'
): Promise<{ newLevel: TrustLevel; promoted: boolean }> {
  const hasReply = signalType === 'reply';

  // Check for deal (still needed as input to the atomic function)
  const { count: dealCount } = await db
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('contact_id', contactId)
    .eq('status', 'closed');

  const hasClosedDeal = (dealCount ?? 0) > 0;

  const { data, error } = await db.rpc('promote_trust_level', {
    p_contact_id: contactId,
    p_realtor_id: realtorId,
    p_positive_increment: 1,
    p_has_reply: hasReply,
    p_has_deal: hasClosedDeal,
  }).single();

  if (error) {
    logger.error({ error, contactId }, 'trust: promote_trust_level RPC failed');
    return { newLevel: 0, promoted: false };
  }

  const result = data as { new_level?: number; promoted?: boolean } | null;
  const newLevel = (result?.new_level ?? 0) as TrustLevel;
  const promoted = result?.promoted ?? false;

  if (promoted) {
    logger.info({ contactId, to: newLevel, signal: signalType }, 'trust: promoted');
  }

  return { newLevel, promoted };
}

/**
 * Record a negative signal (unsubscribe, complaint, bounce) and potentially demote.
 * Demotion drops exactly 1 level (never more) to avoid trust oscillation.
 *
 * Uses an atomic Postgres function (088_trust_level_atomic.sql) to avoid
 * TOCTOU race conditions.
 */
export async function recordNegativeSignal(
  db: SupabaseClient,
  realtorId: string,
  contactId: string,
  signalType: 'unsubscribe' | 'complaint' | 'bounce'
): Promise<{ newLevel: TrustLevel; demoted: boolean }> {
  const { data, error } = await db.rpc('demote_trust_level', {
    p_contact_id: contactId,
    p_realtor_id: realtorId,
  }).single();

  if (error) {
    logger.error({ error, contactId }, 'trust: demote_trust_level RPC failed');
    return { newLevel: 0, demoted: false };
  }

  const negResult = data as { new_level?: number; demoted?: boolean } | null;
  const newLevel = (negResult?.new_level ?? 0) as TrustLevel;
  const demoted = negResult?.demoted ?? false;

  if (demoted) {
    logger.warn({ contactId, to: newLevel, signal: signalType }, 'trust: demoted');
  }

  return { newLevel, demoted };
}
