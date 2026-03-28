"use client";

import { useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { Tour } from "./TourDefinitions";

interface TourLauncherProps {
  tour: Tour;
  className?: string;
  children?: React.ReactNode;
}

export function TourLauncher({ tour, className, children }: TourLauncherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);

  const startTour = useCallback(() => {
    // If we're not on the tour's start page, navigate there first
    if (pathname !== tour.startPage) {
      setNavigating(true);
      router.push(tour.startPage);
      setTimeout(() => setNavigating(false), 2000);
      return;
    }

    // We're on the right page — find valid steps
    const validSteps = tour.steps.filter((step) => {
      const el = document.querySelector(step.element);
      if (!el) {
        console.warn(`[Tour] Selector not found: "${step.element}"`);
        return false;
      }
      return true;
    });

    if (validSteps.length === 0) return;

    const d = driver({
      showProgress: true,
      animate: true,
      overlayColor: "rgba(0, 0, 0, 0.5)",
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
  }, [tour, router, pathname]);

  return (
    <button onClick={startTour} className={className || "lf-btn-ghost text-sm"} disabled={navigating}>
      {navigating ? "Navigating..." : (children || `▶ ${tour.title} (${tour.duration})`)}
    </button>
  );
}
