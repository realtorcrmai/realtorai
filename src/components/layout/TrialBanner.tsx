"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { trialDaysRemaining } from "@/lib/plans";

/**
 * Thin trial countdown banner at top of all dashboard pages (B5).
 * Shows when trial is active AND < 5 days remaining.
 * Dismissible (re-shows next day via cookie).
 */
export function TrialBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = document.cookie.split("; ").find((c) => c.startsWith("lf-trial-dismissed="));
    return !!stored;
  });

  const trialEndsAt = (session?.user as Record<string, unknown> | undefined)?.trialEndsAt as string | null;
  const daysLeft = trialDaysRemaining(trialEndsAt);

  // Only show if trial active and < 5 days remaining
  if (!trialEndsAt || daysLeft === 0 || daysLeft > 5 || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    // Cookie expires in 1 day (re-shows tomorrow)
    document.cookie = `lf-trial-dismissed=1; max-age=86400; path=/`;
  };

  return (
    <div className="bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] text-white px-4 py-1.5 flex items-center justify-center gap-3 text-xs">
      <span>
        {daysLeft} day{daysLeft !== 1 ? "s" : ""} left on your Professional trial
      </span>
      <Link
        href="/settings/billing"
        className="font-semibold underline underline-offset-2 hover:no-underline"
      >
        Upgrade
      </Link>
      <button
        onClick={handleDismiss}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
