"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, X, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  helpSlug: string;
  checkRoute: string;     // CRM page to complete this action
  complete: boolean;
}

const DEFAULT_ITEMS: Omit<ChecklistItem, "complete">[] = [
  { id: "first-contact", label: "Create your first contact", helpSlug: "contact-management", checkRoute: "/contacts" },
  { id: "first-listing", label: "Add a listing", helpSlug: "listing-workflow", checkRoute: "/listings" },
  { id: "phase-1-complete", label: "Complete seller intake (Phase 1)", helpSlug: "listing-workflow", checkRoute: "/listings" },
  { id: "forms-generated", label: "Generate BCREA forms", helpSlug: "bc-forms-generation", checkRoute: "/forms" },
  { id: "first-showing", label: "Schedule a showing", helpSlug: "showing-management", checkRoute: "/showings" },
  { id: "first-email", label: "Send your first email campaign", helpSlug: "email-marketing-engine", checkRoute: "/newsletters" },
  { id: "used-voice", label: "Use the voice agent", helpSlug: "voice-agent", checkRoute: "/" },
];

/**
 * Persistent onboarding checklist that tracks real CRM actions.
 * Shows for 30 days after first use. State persisted in localStorage.
 */
function loadOnboardingState() {
  if (typeof window === "undefined") return { items: [], minimized: false, dismissed: false, loaded: false };
  const stored = localStorage.getItem("lf-onboarding");
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.dismissed) return { items: [], minimized: false, dismissed: true, loaded: true };
      return {
        items: DEFAULT_ITEMS.map((item) => ({
          ...item,
          complete: data.completed?.includes(item.id) || false,
        })),
        minimized: !!data.minimized,
        dismissed: false,
        loaded: true,
      };
    } catch {
      return { items: DEFAULT_ITEMS.map((item) => ({ ...item, complete: false })), minimized: false, dismissed: false, loaded: true };
    }
  }
  localStorage.setItem("lf-onboarding", JSON.stringify({ started: new Date().toISOString(), completed: [], dismissed: false }));
  return { items: DEFAULT_ITEMS.map((item) => ({ ...item, complete: false })), minimized: false, dismissed: false, loaded: true };
}

export function OnboardingChecklist() {
  const [initialState] = useState(loadOnboardingState);
  const [items, setItems] = useState<ChecklistItem[]>(initialState.items);
  const [minimized, setMinimized] = useState(initialState.minimized);
  const [dismissed, setDismissed] = useState(initialState.dismissed);
  const [loaded] = useState(initialState.loaded);

  // Save state on change
  useEffect(() => {
    if (!loaded || dismissed) return;
    const completed = items.filter((i) => i.complete).map((i) => i.id);
    const stored = JSON.parse(localStorage.getItem("lf-onboarding") || "{}");
    localStorage.setItem("lf-onboarding", JSON.stringify({ ...stored, completed, minimized }));
  }, [items, minimized, loaded, dismissed]);

  function markComplete(id: string) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, complete: true } : item));
  }

  function dismiss() {
    setDismissed(true);
    const stored = JSON.parse(localStorage.getItem("lf-onboarding") || "{}");
    localStorage.setItem("lf-onboarding", JSON.stringify({ ...stored, dismissed: true }));
  }

  if (!loaded || dismissed) return null;

  const completedCount = items.filter((i) => i.complete).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;
  const progress = Math.round((completedCount / totalCount) * 100);
  const nextIncomplete = items.find((i) => !i.complete);

  // All done — show celebration then auto-dismiss after 5 seconds
  if (allComplete) {
    return (
      <div className="fixed bottom-6 right-6 z-40 w-72 lf-card p-4 shadow-lg border border-green-200 bg-green-50 animate-in fade-in-0 zoom-in-95">
        <p className="text-sm font-semibold text-green-700">🎉 You&apos;re all set!</p>
        <p className="text-xs text-green-600 mt-1">You&apos;ve completed the getting started checklist.</p>
        <button onClick={dismiss} className="text-xs text-green-500 hover:underline mt-2">Dismiss</button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-72 lf-card shadow-lg animate-in fade-in-0 zoom-in-95">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <button onClick={() => setMinimized(!minimized)} className="flex items-center gap-2 text-sm font-semibold text-foreground">
          🚀 Getting Started ({completedCount}/{totalCount})
          {minimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button onClick={dismiss} aria-label="Dismiss checklist" className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-3 py-2">
        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Items (when expanded) */}
      {!minimized && (
        <div className="px-3 pb-3 space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <button
                onClick={() => !item.complete && markComplete(item.id)}
                disabled={item.complete}
                className="mt-0.5 shrink-0"
                aria-label={item.complete ? `${item.label} completed` : `Mark ${item.label} as complete`}
              >
                {item.complete ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <span className={cn("text-xs", item.complete ? "text-muted-foreground line-through" : "text-foreground")}>
                  {item.label}
                </span>
              </div>
              {!item.complete && (
                <Link href={item.checkRoute} className="text-[10px] text-primary hover:underline shrink-0">
                  Go
                </Link>
              )}
            </div>
          ))}

          {nextIncomplete && (
            <Link
              href={nextIncomplete.checkRoute}
              className="block mt-3 text-center text-xs text-primary hover:underline font-medium"
            >
              Continue: {nextIncomplete.label} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
