"use client";

import { useState, useEffect } from "react";
import { FEATURES } from "@/lib/constants/features";

type FeatureFlagResult = {
  enabled: boolean;
  loading: boolean;
};

/**
 * Check if a feature is enabled.
 * Reads config default, then checks for runtime override from the API.
 */
export function useFeatureFlag(featureId: string): FeatureFlagResult {
  const configDefault = FEATURES[featureId]?.enabled ?? false;
  const [enabled, setEnabled] = useState(configDefault);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkOverride() {
      try {
        const res = await fetch(`/api/features?id=${featureId}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.override !== undefined) {
            setEnabled(data.override);
          }
        }
      } catch {
        // Fall back to config default on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkOverride();
    return () => { cancelled = true; };
  }, [featureId]);

  return { enabled, loading };
}

/**
 * Bulk check multiple features at once (more efficient for navigation).
 * Returns a map of featureId → enabled state.
 */
export function useFeatureFlags(featureIds: string[]): {
  flags: Record<string, boolean>;
  loading: boolean;
} {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const id of featureIds) {
      initial[id] = FEATURES[id]?.enabled ?? false;
    }
    return initial;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkOverrides() {
      try {
        const res = await fetch("/api/features");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.overrides) {
            setFlags((prev) => {
              const next = { ...prev };
              for (const [id, override] of Object.entries(
                data.overrides as Record<string, boolean>
              )) {
                if (id in next) {
                  next[id] = override;
                }
              }
              return next;
            });
          }
        }
      } catch {
        // Fall back to config defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkOverrides();
    return () => { cancelled = true; };
  }, [featureIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { flags, loading };
}
