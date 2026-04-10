"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { fireConfetti } from "@/hooks/useConfetti";

/**
 * Fires confetti on the dashboard when arriving from onboarding (?welcome=1).
 * One-time — removes the query param after firing so refresh doesn't re-trigger.
 */
export function WelcomeConfetti() {
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (searchParams.get("welcome") === "1" && !fired.current) {
      fired.current = true;
      // Small delay so the dashboard renders first
      setTimeout(() => fireConfetti(), 500);
      // Clean up URL (remove ?welcome=1)
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  return null;
}
