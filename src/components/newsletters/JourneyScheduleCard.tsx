"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JOURNEY_SCHEDULES } from "@/lib/constants/journey-schedules";
import { TEMPLATE_REGISTRY } from "@/lib/constants/template-registry";

const PHASE_LABELS: Record<string, string> = {
  lead: "New Contact",
  active: "Active",
  under_contract: "Under Contract",
  past_client: "Past Client",
  dormant: "Dormant",
};

const PHASE_ICONS: Record<string, string> = {
  lead: "🟢",
  active: "🔥",
  under_contract: "📝",
  past_client: "⭐",
  dormant: "❄️",
};

function formatDelay(hours: number): string {
  if (hours === 0) return "Immediately";
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Day 1";
  if (days < 7) return `Day ${days}`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return "1 week";
  if (days < 60) return `${weeks} weeks`;
  const months = Math.round(days / 30);
  if (months === 1) return "1 month";
  if (days < 365) return `${months} months`;
  return "1 year";
}

export function JourneyScheduleCard() {
  const [activeJourney, setActiveJourney] = useState<"buyer" | "seller">("buyer");
  const [expandedPhase, setExpandedPhase] = useState<string | null>("lead");

  const schedule = JOURNEY_SCHEDULES[activeJourney];
  const phases = Object.entries(schedule);
  const totalEmails = phases.reduce((sum, [, steps]) => sum + steps.length, 0);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Journey Schedule</h4>
            <Badge variant="secondary" className="text-[10px]">{totalEmails} emails</Badge>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <button
              onClick={() => setActiveJourney("buyer")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeJourney === "buyer"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Buyer
            </button>
            <button
              onClick={() => setActiveJourney("seller")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeJourney === "seller"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Seller
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Each {activeJourney} contact moves through these phases automatically. AI personalizes every email.
        </p>

        <div className="space-y-1.5">
          {phases.map(([phase, steps]) => {
            if (steps.length === 0) return null;
            const isExpanded = expandedPhase === phase;

            return (
              <div key={phase} className="border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{PHASE_ICONS[phase]}</span>
                    <span className="text-xs font-medium">{PHASE_LABELS[phase]}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {steps.length} email{steps.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-2.5 space-y-1">
                    {steps.map((step, i) => {
                      const entry = TEMPLATE_REGISTRY[step.emailType];
                      const icon = entry?.icon || "📧";
                      const name = entry?.displayName || step.emailType.replace(/_/g, " ");

                      return (
                        <div
                          key={`${step.emailType}-${i}`}
                          className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors"
                        >
                          {/* Timeline dot + line */}
                          <div className="flex flex-col items-center shrink-0 w-4">
                            <div className="w-2 h-2 rounded-full bg-primary/60" />
                            {i < steps.length - 1 && (
                              <div className="w-px h-3 bg-border mt-0.5" />
                            )}
                          </div>

                          {/* Email info */}
                          <span className="text-sm shrink-0">{icon}</span>
                          <span className="text-xs font-medium flex-1 truncate">{name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 font-normal">
                            {formatDelay(step.delayHours)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-2.5 border-t border-border">
          <a
            href="/newsletters/templates"
            className="text-xs text-primary font-medium hover:underline"
          >
            Preview all templates →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
