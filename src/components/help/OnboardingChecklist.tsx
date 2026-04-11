"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, X, Check, Circle } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { fireConfetti } from "@/hooks/useConfetti";
import type { ChecklistItem } from "@/actions/checklist";

/**
 * Server-backed onboarding checklist (PO1).
 * Bottom-right floating widget with progress ring.
 * Auto-detects completion from real DB state.
 * Confetti fires when all items complete.
 */
export function OnboardingChecklist() {
  const { data: session } = useSession();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allComplete, setAllComplete] = useState(false);

  // Don't show for admins or if no session
  const onboardingCompleted = (session?.user as Record<string, unknown> | undefined)?.onboardingCompleted;

  useEffect(() => {
    if (!session?.user) { setLoading(false); return; }

    fetch("/api/onboarding/checklist")
      .then((r) => r.json())
      .then((data) => {
        if (data.dismissedAll) { setDismissed(true); setLoading(false); return; }
        const fetchedItems = data.items || [];
        setItems(fetchedItems);
        // Check if all complete
        const allDone = fetchedItems.length > 0 && fetchedItems.every((i: ChecklistItem) => i.completed);
        if (allDone && !allComplete) {
          setAllComplete(true);
          fireConfetti();
          // Auto-dismiss after 5s
          setTimeout(() => setDismissed(true), 5000);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, allComplete]);

  // Hide if: loading, dismissed, no items, been more than 30 days since signup
  if (loading || dismissed || items.length === 0 || !session?.user) return null;
  // Also hide if onboarding not completed yet (they're still in the wizard)
  if (onboardingCompleted === false) return null;

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const progress = Math.round((completed / total) * 100);

  const handleDismiss = async () => {
    setDismissed(true);
    await fetch("/api/onboarding/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismiss_all: true }),
    });
  };

  // Progress ring SVG
  const ringSize = 36;
  const strokeWidth = 3;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-40 w-80 bg-card border rounded-xl shadow-lg transition-all duration-300",
      "animate-in fade-in-0 zoom-in-95"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b cursor-pointer" onClick={() => setMinimized(!minimized)}>
        {/* Progress ring */}
        <svg width={ringSize} height={ringSize} className="shrink-0 -rotate-90">
          <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <circle
            cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
            stroke="url(#checklist-gradient)" strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round" className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="checklist-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4f35d2" />
              <stop offset="100%" stopColor="#ff5c3a" />
            </linearGradient>
          </defs>
        </svg>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Getting Started</p>
          <p className="text-xs text-muted-foreground">{completed}/{total} complete</p>
        </div>

        <button onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }} className="p-1">
          {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          className="p-1 hover:bg-muted rounded"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Items */}
      {!minimized && (
        <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg text-sm transition-colors",
                item.completed
                  ? "text-muted-foreground"
                  : "hover:bg-muted text-foreground"
              )}
            >
              {item.completed ? (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <span className={cn(item.completed && "line-through")}>{item.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* All complete celebration */}
      {allComplete && !minimized && (
        <div className="p-3 text-center border-t">
          <p className="text-sm font-semibold text-foreground">You&apos;re all set! 🎉</p>
          <p className="text-xs text-muted-foreground">Great job completing your setup</p>
        </div>
      )}
    </div>
  );
}
