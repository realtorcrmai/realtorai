"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

type Props = {
  queueCount: number;
  children: {
    ai: React.ReactNode;
    insights: React.ReactNode;
  };
};

export function EmailMarketingTabs({ queueCount, children }: Props) {
  const [activeTab, setActiveTab] = useState("ai");

  const tabs = [
    { id: "ai", label: "AI Nurture", badge: queueCount > 0 ? queueCount : undefined },
    { id: "insights", label: "AI Insights" },
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
        {activeTab === "insights" && children.insights}
      </div>
    </div>
  );
}
