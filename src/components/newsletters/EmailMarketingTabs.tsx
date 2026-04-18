"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type Props = {
  queueCount: number;
  hasAutomations: boolean;
  children: {
    ai: React.ReactNode;
    campaigns: React.ReactNode;
    automations: React.ReactNode;
  };
};

export function EmailMarketingTabs({ queueCount, hasAutomations, children }: Props) {
  const [activeTab, setActiveTab] = useState("ai");

  const tabs = [
    { id: "ai", label: "AI", badge: queueCount > 0 ? queueCount : undefined, locked: false },
    { id: "campaigns", label: "Campaigns", locked: false },
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
        {activeTab === "automations" && (
          hasAutomations ? children.automations : <LockedTab featureName="Automations" />
        )}
      </div>
    </div>
  );
}

function LockedTab({ featureName }: { featureName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl">
        🔒
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{featureName} not enabled</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          This feature is not active on your account. Contact your administrator to enable it.
        </p>
      </div>
      <a
        href="mailto:support@realtors360.ai"
        className="text-xs text-primary hover:underline"
      >
        Contact support →
      </a>
    </div>
  );
}
