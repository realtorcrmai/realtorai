"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { ChecklistItem } from "@/actions/checklist";

/**
 * Dashboard onboarding banner (PO6).
 * Shows if checklist < 100% AND within 30 days of signup.
 * "Welcome back, {name}! X of Y setup steps complete — {next action}"
 */
export function OnboardingBanner() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    // Check localStorage dismiss
    const stored = localStorage.getItem("lf-banner-dismissed");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.at && Date.now() - parsed.at < 24 * 60 * 60 * 1000) {
        setDismissed(true);
        setLoading(false);
        return;
      }
    }

    fetch("/api/onboarding/checklist")
      .then((r) => r.json())
      .then((data) => {
        if (data.dismissedAll) setDismissed(true);
        else setItems(data.items || []);
        if (data.name) setFirstName(data.name.split(" ")[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || dismissed) return null;

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  if (total === 0 || completed === total) return null;

  const nextItem = items.find((i) => !i.completed);
  const progress = Math.round((completed / total) * 100);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("lf-banner-dismissed", JSON.stringify({ at: Date.now() }));
  };

  return (
    <div className="mx-4 mt-4 mb-2 p-4 bg-gradient-to-r from-[#4f35d2]/5 to-[#ff5c3a]/5 border border-[#4f35d2]/10 rounded-xl flex items-center gap-4 animate-fade-in">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Welcome back{firstName ? `, ${firstName}` : ""}! {completed} of {total} setup steps complete
        </p>
        {nextItem && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Next: {nextItem.label} —{" "}
            <Link href={nextItem.href} className="text-[#4f35d2] font-medium hover:underline">
              {nextItem.description}
            </Link>
          </p>
        )}
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#4f35d2] to-[#ff5c3a] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 w-8 h-8 rounded-full hover:bg-gray-200/50 flex items-center justify-center transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}
