"use client";

import { useCallback } from "react";
import type { Tour } from "./TourDefinitions";

interface TourLauncherProps {
  tour: Tour;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Button that launches a driver.js guided tour.
 * Falls back gracefully if selectors are missing (skips broken steps).
 */
export function TourLauncher({ tour, className, children }: TourLauncherProps) {
  const startTour = useCallback(async () => {
    // Filter to steps where the element exists in the DOM
    const validSteps = tour.steps.filter((step) => {
      const el = document.querySelector(step.element);
      if (!el) {
        console.warn(`[Tour] Skipping step: selector "${step.element}" not found`);
        return false;
      }
      return true;
    });

    if (validSteps.length === 0) {
      // No valid steps — show a message instead
      alert(`Tour "${tour.title}" is not available on this page. Try navigating to the relevant page first.`);
      return;
    }

    const { driver } = await import("driver.js");
    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0, 0, 0, 0.5)",
      popoverClass: "lf-tour-popover",
      steps: validSteps.map((step) => ({
        element: step.element,
        popover: {
          title: step.popover.title,
          description: step.popover.description,
          side: step.popover.side,
        },
      })),
    });

    d.drive();
  }, [tour]);

  return (
    <button onClick={startTour} className={className || "lf-btn-ghost text-sm"}>
      {children || `Start Tour: ${tour.title}`}
    </button>
  );
}
