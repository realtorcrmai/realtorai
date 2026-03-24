"use client";

import { useMemo } from "react";

type Phase = {
  key: string;
  label: string;
  emoji: string;
};

const BUYER_PHASES: Phase[] = [
  { key: "lead", label: "New Lead", emoji: "🟢" },
  { key: "warm", label: "Warming", emoji: "🌡️" },
  { key: "engaged", label: "Engaged", emoji: "💬" },
  { key: "hot", label: "Hot Lead", emoji: "🔥" },
  { key: "active", label: "Active", emoji: "🏠" },
  { key: "under_contract", label: "Contract", emoji: "📝" },
  { key: "past_client", label: "Closed", emoji: "🎉" },
];

const SELLER_PHASES: Phase[] = [
  { key: "lead", label: "New Lead", emoji: "🟢" },
  { key: "warm", label: "Warming", emoji: "🌡️" },
  { key: "active", label: "Listed", emoji: "🏡" },
  { key: "under_contract", label: "Contract", emoji: "📝" },
  { key: "past_client", label: "Sold", emoji: "🎉" },
];

type Props = {
  contactType: string;
  currentPhase: string | null;
  engagementScore?: number;
  phaseEnteredAt?: string | null;
  enrolledAt?: string | null;
};

export function JourneyProgressBar({
  contactType,
  currentPhase,
  engagementScore = 0,
  phaseEnteredAt,
  enrolledAt,
}: Props) {
  const phases = contactType === "seller" ? SELLER_PHASES : BUYER_PHASES;

  // Map engagement score to a warm/engaged/hot sub-phase for leads
  const effectivePhase = useMemo(() => {
    if (!currentPhase) return null;
    if (currentPhase === "lead") {
      if (engagementScore >= 60) return "hot";
      if (engagementScore >= 40) return "engaged";
      if (engagementScore >= 20) return "warm";
      return "lead";
    }
    return currentPhase;
  }, [currentPhase, engagementScore]);

  const currentIndex = phases.findIndex((p) => p.key === effectivePhase);

  if (!currentPhase) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        Not enrolled in any journey yet
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {contactType === "seller" ? "Seller" : "Buyer"} Journey
        </span>
        {engagementScore > 0 && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              engagementScore >= 60
                ? "bg-red-100 text-red-700"
                : engagementScore >= 40
                ? "bg-amber-100 text-amber-700"
                : engagementScore >= 20
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Score: {engagementScore}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-0 mt-3">
        {phases.map((phase, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div key={phase.key} className="flex items-center flex-1">
              {/* Dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                    isComplete
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : isCurrent
                      ? "bg-primary border-primary text-white ring-4 ring-primary/20"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  {isComplete ? "✓" : phase.emoji}
                </div>
                <span
                  className={`text-[10px] mt-1 text-center leading-tight max-w-[60px] ${
                    isCurrent
                      ? "font-bold text-primary"
                      : isComplete
                      ? "text-emerald-600 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {phase.label}
                </span>
                {isCurrent && phaseEnteredAt && (
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(phaseEnteredAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {i < phases.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    i < currentIndex
                      ? "bg-emerald-500"
                      : i === currentIndex
                      ? "bg-gradient-to-r from-primary to-muted"
                      : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Phase detail */}
      {enrolledAt && (
        <div className="mt-3 text-xs text-muted-foreground text-center">
          Enrolled{" "}
          {new Date(enrolledAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}
    </div>
  );
}
