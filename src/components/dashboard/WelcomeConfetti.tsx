"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fireConfetti } from "@/hooks/useConfetti";
import { WELCOME_TOUR } from "@/components/help/TourDefinitions";

/**
 * Welcome celebration on first dashboard landing after onboarding.
 * - 5 waves of confetti (brand colors from both sides + center burst)
 * - Animated welcome banner with gradient text
 * - Auto-dismisses after 6 seconds
 */
export function WelcomeConfetti({ userName }: { userName?: string }) {
  const searchParams = useSearchParams();
  const fired = useRef(false);
  const [showBanner, setShowBanner] = useState(false);

  const firstName = userName?.split(" ")[0] || "";

  useEffect(() => {
    if (searchParams.get("welcome") !== "1" || fired.current) return;
    fired.current = true;

    // Show welcome banner
    setShowBanner(true);

    // Wave 1: Immediate side bursts
    setTimeout(() => fireConfetti(), 300);

    // Wave 2: Center explosion
    setTimeout(async () => {
      const { default: confetti } = await import("canvas-confetti");
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { x: 0.5, y: 0.4 },
        colors: ["#4f35d2", "#ff5c3a", "#00bfa5", "#FFD700", "#7c5cfc"],
        startVelocity: 40,
        ticks: 80,
        zIndex: 9999,
      });
    }, 1200);

    // Wave 3: Side bursts again
    setTimeout(() => fireConfetti(), 2200);

    // Wave 4: Gentle rain from top
    setTimeout(async () => {
      const { default: confetti } = await import("canvas-confetti");
      confetti({
        particleCount: 60,
        angle: 270,
        spread: 120,
        origin: { x: 0.5, y: -0.1 },
        colors: ["#4f35d2", "#ff5c3a", "#7c5cfc", "#ff8a6a"],
        gravity: 0.8,
        ticks: 100,
        zIndex: 9999,
      });
    }, 3200);

    // Wave 5: Final side burst
    setTimeout(() => fireConfetti(), 4200);

    // Clean up URL
    window.history.replaceState({}, "", "/");

    // Auto-dismiss banner
    setTimeout(() => setShowBanner(false), 6000);

    // Auto-launch welcome tour after banner dismisses
    const tourSeen = localStorage.getItem("lf-welcome-tour-seen");
    if (!tourSeen) {
      localStorage.setItem("lf-welcome-tour-seen", "1");
      setTimeout(async () => {
        const { driver } = await import("driver.js");
        const validSteps = WELCOME_TOUR.steps.filter(
          (s) => document.querySelector(s.element)
        );
        if (validSteps.length > 0) {
          const d = driver({
            showProgress: true,
            steps: validSteps.map((s) => ({
              element: s.element,
              popover: {
                title: s.popover.title,
                description: s.popover.description,
                side: s.popover.side,
              },
            })),
          });
          d.drive();
        }
      }, 500);
    }
  }, [searchParams]);

  if (!showBanner) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 mt-4 mb-2 animate-fade-in">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#4f35d2] via-[#7c5cfc] to-[#ff5c3a] opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />

      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Welcome to Magnate{firstName ? `, ${firstName}` : ""}! 🎉
          </h2>
          <p className="text-white/80 text-sm">
            Your AI-powered real estate CRM is ready. Let&apos;s get started!
          </p>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
