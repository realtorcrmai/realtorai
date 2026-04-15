/**
 * editorial-billing.ts
 *
 * Tier enforcement for the Editorial Newsletter System.
 * Starter: 2 editions per month (free)
 * Pro: unlimited editions, A/B testing, voice learning ($79/mo)
 * Pro Plus: same as Pro + priority support
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EditorialTier = 'starter' | 'pro' | 'pro_plus'

export interface TierFeatures {
  editions_per_month: number   // 999 = unlimited
  ab_testing: boolean
  voice_learning: boolean
}

export interface TierCheckResult {
  allowed: boolean
  reason?: string
  editions_used: number
  limit: number
  tier: EditorialTier
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TIER_LIMITS: Record<EditorialTier, TierFeatures> = {
  starter: {
    editions_per_month: 2,
    ab_testing: false,
    voice_learning: false,
  },
  pro: {
    editions_per_month: 999,
    ab_testing: true,
    voice_learning: true,
  },
  pro_plus: {
    editions_per_month: 999,
    ab_testing: true,
    voice_learning: true,
  },
}

// ── Core checker ──────────────────────────────────────────────────────────────

/**
 * Check whether a realtor is allowed to create another editorial edition.
 *
 * Uses a two-phase strategy:
 *  1. Read `users.editorial_tier` and `users.editorial_editions_this_month`
 *     for a quick cached count.
 *  2. If we cannot find the users row (new schema field) fall back to counting
 *     editions created this calendar month directly from `editorial_editions`.
 *
 * Never throws — always returns a result object.
 */
export async function checkEditorialTierLimit(
  realtorId: string,
  supabase: SupabaseClient,
): Promise<TierCheckResult> {
  // Default fallback (fail-open so we never block on a DB error)
  const fallback: TierCheckResult = {
    allowed: true,
    editions_used: 0,
    limit: 2,
    tier: 'starter',
  }

  try {
    // 1. Fetch tier info from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('editorial_tier, editorial_editions_this_month, editorial_trial_ends_at')
      .eq('id', realtorId)
      .maybeSingle()

    if (userError) {
      console.warn('[editorial-billing] Failed to fetch user tier:', userError.message)
      return fallback
    }

    const tier: EditorialTier =
      (user?.editorial_tier as EditorialTier | null | undefined) ?? 'starter'

    const limits = TIER_LIMITS[tier]

    // Check trial: if trial_ends_at is in the future, treat as pro
    const effectiveTier: EditorialTier = (() => {
      if (tier !== 'starter') return tier
      const trialEnds = user?.editorial_trial_ends_at
      if (trialEnds && new Date(trialEnds) > new Date()) return 'pro'
      return 'starter'
    })()

    const effectiveLimits = TIER_LIMITS[effectiveTier]

    // Unlimited tiers always pass
    if (effectiveLimits.editions_per_month >= 999) {
      return {
        allowed: true,
        editions_used: user?.editorial_editions_this_month ?? 0,
        limit: effectiveLimits.editions_per_month,
        tier: effectiveTier,
      }
    }

    // 2. Count editions this calendar month (source of truth — more accurate
    //    than the cached counter, which may lag after bulk operations)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count, error: countError } = await supabase
      .from('editorial_editions')
      .select('id', { count: 'exact', head: true })
      .eq('realtor_id', realtorId)
      .gte('created_at', startOfMonth.toISOString())
      .not('status', 'eq', 'failed') // failed editions don't count

    if (countError) {
      console.warn('[editorial-billing] Failed to count editions:', countError.message)
      // Fall back to cached counter
      const cached = user?.editorial_editions_this_month ?? 0
      return {
        allowed: cached < effectiveLimits.editions_per_month,
        reason:
          cached >= effectiveLimits.editions_per_month
            ? 'Monthly limit reached. Upgrade to Pro for unlimited editions.'
            : undefined,
        editions_used: cached,
        limit: effectiveLimits.editions_per_month,
        tier: effectiveTier,
      }
    }

    const editionsUsed = count ?? 0
    const limitReached = editionsUsed >= limits.editions_per_month

    return {
      allowed: !limitReached,
      reason: limitReached
        ? 'Monthly limit reached. Upgrade to Pro to send unlimited editions.'
        : undefined,
      editions_used: editionsUsed,
      limit: limits.editions_per_month,
      tier: effectiveTier,
    }
  } catch (err) {
    console.warn(
      '[editorial-billing] Unexpected error in tier check:',
      err instanceof Error ? err.message : err,
    )
    // Fail-open: never block users on infra errors
    return fallback
  }
}

/**
 * Returns a user-facing description of the tier.
 */
export function tierLabel(tier: EditorialTier): string {
  switch (tier) {
    case 'starter':  return 'Free Starter'
    case 'pro':      return 'Pro'
    case 'pro_plus': return 'Pro Plus'
    default:         return 'Starter'
  }
}
