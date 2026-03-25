"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Bot,
  Megaphone,
  BarChart3,
  Route,
  Settings2,
  Handshake,
} from "lucide-react";

type Tab = {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

type Props = {
  queueCount: number;
  children: {
    overview: React.ReactNode;
    queue: React.ReactNode;
    campaigns: React.ReactNode;
    relationships: React.ReactNode;
    journeys: React.ReactNode;
    analytics: React.ReactNode;
    settings: React.ReactNode;
  };
};

export function EmailMarketingTabs({ queueCount, children }: Props) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs: Tab[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "queue", label: "AI Agent", icon: <Bot className="w-4 h-4" />, badge: queueCount > 0 ? queueCount : undefined },
    { id: "campaigns", label: "Campaigns", icon: <Megaphone className="w-4 h-4" /> },
    { id: "relationships", label: "Relationships", icon: <Handshake className="w-4 h-4" /> },
    { id: "journeys", label: "Journeys", icon: <Route className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "settings", label: "Settings", icon: <Settings2 className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <Badge
                variant={activeTab === tab.id ? "outline" : "secondary"}
                className={`text-[10px] px-1.5 py-0 ml-0.5 ${
                  activeTab === tab.id ? "border-white/50 text-white" : ""
                }`}
              >
                {tab.badge}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && children.overview}
        {activeTab === "queue" && children.queue}
        {activeTab === "campaigns" && children.campaigns}
        {activeTab === "relationships" && children.relationships}
        {activeTab === "journeys" && children.journeys}
        {activeTab === "analytics" && children.analytics}
        {activeTab === "settings" && children.settings}
      </div>
    </div>
  );
}
