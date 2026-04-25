"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type Props = {
  queueCount: number;
  hasAutomations: boolean;
  children: {
    ai: React.ReactNode;
    campaigns?: React.ReactNode;
    insights: React.ReactNode;
    automations: React.ReactNode;
  };
};

export function EmailMarketingTabs({ queueCount, hasAutomations, children }: Props) {
  const [activeTab, setActiveTab] = useState("ai");
  // Bug fix #5: allow dismissing the "Automations not enabled" overlay
  const [automationsBannerDismissed, setAutomationsBannerDismissed] = useState(false);

  const tabs = [
    { id: "ai", label: "AI Nurture", badge: queueCount > 0 ? queueCount : undefined, locked: false },
    { id: "insights", label: "AI Insights", locked: false },
    { id: "automations", label: "Automations", locked: !hasAutomations },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.locked && (
              <span className="text-[10px] ml-0.5">🔒</span>
            )}
            {tab.badge !== undefined && (
              <Badge
                variant={activeTab === tab.id ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {tab.badge}
              </Badge>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === "ai" && children.ai}
        {activeTab === "campaigns" && children.campaigns}
        {activeTab === "insights" && children.insights}
        {activeTab === "automations" && (
          hasAutomations
            ? children.automations
            : (
              <div className="relative">
                {/* Content visible but non-interactive */}
                <div className="pointer-events-none select-none opacity-40">
                  {children.automations}
                </div>
                {/* Bug fix #5: overlay is now dismissible via "Got it" button */}
                {!automationsBannerDismissed && (
                  <div className="absolute inset-0 flex items-start justify-center pt-16">
                    <div className="bg-background border border-border rounded-xl shadow-lg px-6 py-5 text-center max-w-sm">
                      <p className="text-2xl mb-2">🔒</p>
                      <p className="text-sm font-semibold text-foreground">Automations not enabled</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Contact your administrator to unlock this feature.
                      </p>
                      <button
                        onClick={() => setAutomationsBannerDismissed(true)}
                        className="mt-4 text-xs px-4 py-1.5 rounded-lg border border-border font-medium hover:bg-muted transition-colors"
                      >
                        Got it
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
        )}
      </div>
    </div>
  );
}
