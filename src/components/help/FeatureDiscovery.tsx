"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

const FEATURE_HINTS: { path: string; feature: string; message: string; cta: string }[] = [
  { path: "/newsletters", feature: "email_marketing", message: "AI can write your newsletters for you", cta: "Try AI Email →" },
  { path: "/content", feature: "ai_content", message: "Generate MLS remarks, social posts & video prompts with AI", cta: "Try Content Engine →" },
  { path: "/showings", feature: "showings", message: "Smart scheduling syncs with your Google Calendar", cta: "Schedule a Showing →" },
  { path: "/workflow", feature: "mls_workflow", message: "Track your listing from intake to MLS submission", cta: "Start Workflow →" },
  { path: "/forms", feature: "bc_forms", message: "Auto-fill 12 BCREA forms from your listing data", cta: "Generate Forms →" },
];

/**
 * Feature discovery component (PO7).
 * Tracks which pages the user has visited.
 * After 7 days, shows a toast suggesting one unvisited feature per session.
 * Max 1 toast per session. Cycles through features weekly.
 */
export function FeatureDiscovery() {
  const pathname = usePathname();
  const [toastShown, setToastShown] = useState(false);

  // Track page visits
  useEffect(() => {
    if (!pathname) return;
    const visits = JSON.parse(localStorage.getItem("lf-page-visits") || "{}");
    visits[pathname] = Date.now();
    localStorage.setItem("lf-page-visits", JSON.stringify(visits));
  }, [pathname]);

  // Show feature hint for unvisited pages (max 1 per session)
  useEffect(() => {
    if (toastShown || pathname !== "/") return; // Only show on dashboard

    const timer = setTimeout(() => {
      const visits = JSON.parse(localStorage.getItem("lf-page-visits") || "{}");
      const signupDate = localStorage.getItem("lf-signup-date");

      // Only show after 7 days
      if (signupDate && Date.now() - parseInt(signupDate) < 7 * 24 * 60 * 60 * 1000) return;

      // Find first unvisited feature
      const lastHintIdx = parseInt(localStorage.getItem("lf-discovery-idx") || "0");

      for (let i = 0; i < FEATURE_HINTS.length; i++) {
        const idx = (lastHintIdx + i) % FEATURE_HINTS.length;
        const hint = FEATURE_HINTS[idx];
        if (!visits[hint.path]) {
          toast.info(hint.message, {
            action: {
              label: hint.cta,
              onClick: () => { window.location.href = hint.path; },
            },
            duration: 8000,
          });
          localStorage.setItem("lf-discovery-idx", String(idx + 1));
          setToastShown(true);
          break;
        }
      }
    }, 3000); // Delay to not overwhelm on page load

    return () => clearTimeout(timer);
  }, [pathname, toastShown]);

  return null;
}
