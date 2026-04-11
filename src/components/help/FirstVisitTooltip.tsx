"use client";

import { useEffect, useRef } from "react";

interface FirstVisitTooltipProps {
  /** Unique page key for localStorage tracking */
  pageKey: string;
  /** CSS selector of the element to highlight */
  targetSelector: string;
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
  /** Only show if page has no data (pass true when data count === 0) */
  showOnlyWhenEmpty?: boolean;
}

/**
 * First-visit tooltip using driver.js (PO5).
 * Shows a single tooltip on first visit to each major page.
 * Tracked in localStorage — dismissed forever after first show.
 * Respects showOnlyWhenEmpty — won't show if page already has data.
 */
export function FirstVisitTooltip({
  pageKey,
  targetSelector,
  title,
  description,
  showOnlyWhenEmpty = false,
}: FirstVisitTooltipProps) {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;

    // Check if already visited
    const key = `lf-visited-${pageKey}`;
    if (localStorage.getItem(key)) return;

    // Don't show if data exists and showOnlyWhenEmpty is true
    if (showOnlyWhenEmpty) return;

    // Small delay to let page render
    const timer = setTimeout(async () => {
      const target = document.querySelector(targetSelector);
      if (!target) return;

      try {
        const { driver } = await import("driver.js");
        const d = driver({
          showProgress: false,
          showButtons: ["close"],
          popoverClass: "lf-tooltip-popover",
          steps: [{
            element: targetSelector,
            popover: { title, description, side: "bottom", align: "start" },
          }],
          onDestroyed: () => {
            localStorage.setItem(key, "1");
          },
        });
        d.drive();
        shown.current = true;
      } catch {
        // driver.js not available — silent fail
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [pageKey, targetSelector, title, description, showOnlyWhenEmpty]);

  return null;
}
