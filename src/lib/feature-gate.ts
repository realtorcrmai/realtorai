/**
 * Backend Feature Gate
 *
 * Checks whether a feature flag is enabled for a given realtor by reading
 * directly from the database (bypasses JWT cache). Used by automated send
 * paths to enforce admin-controlled feature toggles at runtime.
 *
 * Results are cached for 60 seconds per realtor+feature pair to avoid
 * a DB hit on every workflow step execution.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getUserFeatures, type FeatureKey } from "@/lib/features";

type CacheEntry = { enabled: boolean; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Returns true if `feature` is enabled for `realtorId`.
 * Reads from `users` table directly — immune to JWT caching.
 * Falls back to false if the user is not found.
 */
export async function isFeatureEnabled(
  realtorId: string,
  feature: FeatureKey,
): Promise<boolean> {
  if (!realtorId) return false;

  const cacheKey = `${realtorId}:${feature}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.enabled;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("users")
    .select("plan, enabled_features")
    .eq("id", realtorId)
    .single();

  if (!data) {
    // Unknown realtor — fail closed
    cache.set(cacheKey, { enabled: false, expiresAt: Date.now() + CACHE_TTL_MS });
    return false;
  }

  const features = getUserFeatures(
    data.plan ?? "free",
    data.enabled_features as string[] | null,
  );
  const enabled = features.includes(feature);

  cache.set(cacheKey, { enabled, expiresAt: Date.now() + CACHE_TTL_MS });
  return enabled;
}
