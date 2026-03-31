"use client";

import { useState } from "react";
import { IntegrationCodesTab } from "./IntegrationCodesTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { LeadsTab } from "./LeadsTab";
import { SessionsTab } from "./SessionsTab";
import { SettingsTab } from "./SettingsTab";

const TABS = [
  { id: "codes", label: "Integration Codes", icon: "🔗" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "sessions", label: "Sessions", icon: "👁" },
  { id: "leads", label: "Leads", icon: "👥" },
  { id: "settings", label: "Settings", icon: "⚙️" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  config: any;
  analytics: any;
  leads: any[];
  sessions: any[];
}

export function WebsiteDashboardClient({ config, analytics, leads, sessions }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("codes");

  // eslint-disable-next-line react-hooks/purity
  const [sevenDaysAgo] = useState(() => new Date(Date.now() - 7 * 86400000));
  const newLeads = leads.filter(l => new Date(l.created_at) > sevenDaysAgo).length;

  return (
    <div style={{ marginTop: 100, padding: "0 18px 40px" }}>
      {/* Header */}
      <div className="lf-glass" style={{
        position: "fixed", top: 60, left: 0, right: 0, zIndex: 40,
        padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h1 style={{
          fontSize: 20, fontWeight: 700, margin: 0,
          background: "linear-gradient(135deg, #4f35d2, #ff5c3a)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Website Marketing
        </h1>
        <div style={{ display: "flex", gap: 6 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                background: activeTab === tab.id ? "#4f35d2" : "rgba(79,53,210,0.08)",
                color: activeTab === tab.id ? "#fff" : "#4f35d2",
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              {tab.icon} {tab.label}
              {tab.id === "leads" && newLeads > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: "#ff5c3a", color: "#fff", fontSize: 10, fontWeight: 700,
                  width: 18, height: 18, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>{newLeads}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ marginTop: 16 }}>
        {activeTab === "codes" && <IntegrationCodesTab config={config} />}
        {activeTab === "analytics" && <AnalyticsTab analytics={analytics} />}
        {activeTab === "sessions" && <SessionsTab sessions={sessions} />}
        {activeTab === "leads" && <LeadsTab leads={leads} />}
        {activeTab === "settings" && <SettingsTab config={config} />}
      </div>
    </div>
  );
}
