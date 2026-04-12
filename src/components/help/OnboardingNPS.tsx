"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X } from "lucide-react";

/**
 * 1-question NPS survey shown after onboarding checklist is completed.
 * "How easy was it to get started?" — 1-5 scale.
 * Shows once, stores result via API, dismisses permanently.
 */
export function OnboardingNPS() {
  const { data: session } = useSession();
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Don't show if already dismissed or submitted
    const dismissed = localStorage.getItem("lf-nps-dismissed");
    if (dismissed) return;

    // Check if checklist is fully complete
    const checkTimer = setTimeout(async () => {
      try {
        const res = await fetch("/api/onboarding/checklist");
        const data = await res.json();
        if (data.dismissedAll) {
          // Checklist was dismissed — show NPS after a delay
          setTimeout(() => setVisible(true), 5000);
        } else {
          const items = data.items || [];
          const allDone = items.length > 0 && items.every((i: { completed: boolean }) => i.completed);
          if (allDone) {
            setTimeout(() => setVisible(true), 3000);
          }
        }
      } catch { /* ignore */ }
    }, 2000);

    return () => clearTimeout(checkTimer);
  }, [session]);

  const handleScore = async (score: number) => {
    setSelectedScore(score);
    setSubmitted(true);
    localStorage.setItem("lf-nps-dismissed", "1");

    // Save to backend
    try {
      await fetch("/api/onboarding/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
    } catch { /* best effort */ }

    // Auto-dismiss after showing thank you
    setTimeout(() => setVisible(false), 2500);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("lf-nps-dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 w-80 bg-card border rounded-xl shadow-lg animate-in fade-in-0 slide-in-from-bottom-4">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">
            {submitted ? "Thanks for your feedback!" : "Quick question"}
          </p>
          {!submitted && (
            <button onClick={handleDismiss} className="p-0.5 hover:bg-muted rounded" aria-label="Dismiss">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {submitted ? (
          <p className="text-xs text-muted-foreground">
            {selectedScore && selectedScore >= 4
              ? "Glad you had a smooth start!"
              : "We'll use this to improve the experience."}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              How easy was it to get started with Realtors360?
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => handleScore(score)}
                  className="flex-1 h-10 rounded-lg border text-sm font-medium transition-all hover:border-brand hover:bg-brand/5 hover:text-brand active:scale-95"
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">Difficult</span>
              <span className="text-[10px] text-muted-foreground">Very easy</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
