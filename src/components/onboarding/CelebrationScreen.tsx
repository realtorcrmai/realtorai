"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatedCheckmark } from "./AnimatedCheckmark";
import { fireConfetti } from "@/hooks/useConfetti";

const SETUP_ITEMS = [
  "Creating your workspace",
  "Loading your templates",
  "Configuring AI assistant",
  "You're all set!",
];

const STAGGER_MS = 800;

interface CelebrationScreenProps {
  /** Where to redirect after celebration (default: /) */
  destination?: string;
}

/**
 * Full celebration screen (C1-C7).
 * Phase 1 (0-3.2s): Staggered checkmarks
 * Phase 2 (3.2s): Fireworks + welcome card
 * Phase 3 (5s): "Go to Dashboard" button fades in
 * Auto-redirect after 15s if user doesn't click.
 */
export function CelebrationScreen({ destination = "/" }: CelebrationScreenProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [completedItems, setCompletedItems] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [featureCount, setFeatureCount] = useState(0);
  const confettiFired = useRef(false);

  const firstName = session?.user?.name?.split(" ")[0] || "";
  const enabledFeatures = (session?.user as Record<string, unknown> | undefined)?.enabledFeatures;
  const totalFeatures = Array.isArray(enabledFeatures) ? enabledFeatures.length : 0;

  // Phase 1: Stagger checkmarks
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    SETUP_ITEMS.forEach((_, i) => {
      timers.push(setTimeout(() => setCompletedItems(i + 1), (i + 1) * STAGGER_MS));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Phase 2: Fireworks after all checkmarks done
  useEffect(() => {
    if (completedItems === SETUP_ITEMS.length && !confettiFired.current) {
      confettiFired.current = true;
      // Small delay for the last checkmark to settle
      setTimeout(() => {
        fireConfetti();
        setShowWelcome(true);
      }, 400);
    }
  }, [completedItems]);

  // Phase 2: Count-up animation for features
  useEffect(() => {
    if (!showWelcome || totalFeatures === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(totalFeatures / 20));
    const interval = setInterval(() => {
      current = Math.min(current + step, totalFeatures);
      setFeatureCount(current);
      if (current >= totalFeatures) clearInterval(interval);
    }, 75);
    return () => clearInterval(interval);
  }, [showWelcome, totalFeatures]);

  // Phase 3: Show button after welcome
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowButton(true), 1800);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Auto-redirect after 15s — use hard redirect to force fresh session
  useEffect(() => {
    const timer = setTimeout(() => { window.location.href = destination; }, 15000);
    return () => clearTimeout(timer);
  }, [destination]);

  const reducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#f4f2ff] to-[#e8e4ff] flex flex-col items-center justify-center">
      {/* Phase 1: Staggered checkmarks */}
      {!showWelcome && (
        <div className="w-full max-w-sm space-y-4 px-4">
          {SETUP_ITEMS.map((label, i) => (
            <AnimatedCheckmark
              key={label}
              label={label}
              state={
                completedItems > i
                  ? "done"
                  : completedItems === i
                  ? "loading"
                  : "pending"
              }
              delay={reducedMotion ? 0 : i * 100}
            />
          ))}
        </div>
      )}

      {/* Phase 2: Welcome card */}
      {showWelcome && (
        <div className="text-center animate-float-in px-4">
          {/* Gradient heading (C4, C6) */}
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{
              background: "linear-gradient(135deg, #4f35d2, #ff5c3a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Welcome to Realtors360{firstName ? `, ${firstName}` : ""}!
          </h1>

          {/* Feature counter (C5) */}
          {totalFeatures > 0 && (
            <p className="text-lg text-gray-600 mb-6">
              <span className="font-bold text-[#4f35d2] text-xl">{featureCount}</span> features unlocked
            </p>
          )}

          <p className="text-sm text-gray-500 mb-8">
            Your AI-powered real estate CRM is ready
          </p>

          {/* CTA button — fades in (Phase 3) */}
          {showButton && (
            <button
              onClick={() => { window.location.href = destination; }}
              className="px-8 py-3 bg-[#4f35d2] text-white rounded-xl text-sm font-semibold hover:bg-[#3d28a8] transition-all animate-fade-in shadow-lg shadow-[#4f35d2]/20"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}
