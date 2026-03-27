"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { Tour } from "./TourDefinitions";

interface TourLauncherProps {
  tour: Tour;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Button that launches a driver.js guided tour.
 * If elements aren't on current page, navigates to the first step's page first.
 * Falls back gracefully if selectors are missing (skips broken steps).
 */
export function TourLauncher({ tour, className, children }: TourLauncherProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const startTour = useCallback(() => {
    // Check if the first step has a navigateTo — if so, go there first
    const firstStepPage = tour.steps[0]?.navigateTo;

    // Filter to steps where the element exists in the DOM
    const validSteps = tour.steps.filter((step) => {
      const el = document.querySelector(step.element);
      if (!el) {
        console.warn(`[Tour] Skipping step: selector "${step.element}" not found`);
        return false;
      }
      return true;
    });

    if (validSteps.length === 0 && firstStepPage) {
      // No elements on this page — navigate to the correct page
      setNavigating(true);
      router.push(firstStepPage);
      // Tour will need to be re-triggered after navigation
      // For now, just navigate — user can click the tour button on the target page
      setTimeout(() => setNavigating(false), 2000);
      return;
    }

    if (validSteps.length === 0) {
      // No steps and no page to navigate to — can't do anything
      return;
    }

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
  }, [tour, router]);

  return (
    <button onClick={startTour} className={className || "lf-btn-ghost text-sm"} disabled={navigating}>
      {navigating ? "Navigating..." : (children || `Start Tour: ${tour.title}`)}
    </button>
  );
}
