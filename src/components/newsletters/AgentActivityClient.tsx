"use client";

import { useState } from "react";
import type { ActivityFeedItem } from "@/actions/agent-decisions";

const DECISION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  send: { bg: "#dcfce7", color: "#059669", label: "Send" },
  skip: { bg: "#fef9c3", color: "#ca8a04", label: "Skip" },
  defer: { bg: "#ffedd5", color: "#ea580c", label: "Defer" },
  suppress: { bg: "#fecaca", color: "#dc2626", label: "Suppress" },
};

export default function AgentActivityClient({ initialFeed }: { initialFeed: ActivityFeedItem[] }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = initialFeed.filter((item) => {
    if (filter !== "all" && item.decision !== filter) return false;
    if (search && !item.contactName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="lf-card" style={{ padding: "12px 16px", marginBottom: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="lf-input"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 200, fontSize: 13 }}
        />
        <select className="lf-select" style={{ width: "auto", fontSize: 13 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Decisions</option>
          <option value="send">Send</option>
          <option value="skip">Skip</option>
          <option value="defer">Defer</option>
          <option value="suppress">Suppress</option>
        </select>
        <span style={{ fontSize: 13, color: "#6b6b8d", marginLeft: "auto" }}>
          {filtered.length} decisions
        </span>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center", color: "#6b6b8d" }}>
          {"🤖"} No agent decisions in the last 7 days
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((item) => {
            const dc = DECISION_COLORS[item.decision] ?? DECISION_COLORS.skip;
            return (
              <div key={item.id} className="lf-card" style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {/* Timestamp */}
                  <div style={{ fontSize: 12, color: "#a0a0b0", minWidth: 70 }}>
                    {new Date(item.createdAt).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
                    <div style={{ fontSize: 11 }}>{new Date(item.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</div>
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff",
                    background: item.contactType === "seller" ? "linear-gradient(135deg, #4f35d2, #ff5c3a)" : "linear-gradient(135deg, #4f35d2, #8b5cf6)",
                  }}>
                    {item.contactName.charAt(0).toUpperCase()}
                  </div>

                  {/* Contact + Event */}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535" }}>{item.contactName}</div>
                    <div style={{ fontSize: 12, color: "#6b6b8d" }}>
                      Triggered by: {item.eventType.replace(/_/g, " ")}
                    </div>
                  </div>

                  {/* Decision badge */}
                  <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: dc.bg, color: dc.color }}>
                    {dc.label}
                  </span>

                  {/* Email type */}
                  {item.emailType && (
                    <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>
                      {item.emailType.replace(/_/g, " ")}
                    </span>
                  )}

                  {/* Relevance */}
                  {item.relevanceScore != null && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.relevanceScore > 65 ? "#059669" : item.relevanceScore > 30 ? "#d97706" : "#6b6b8d" }}>
                      {item.relevanceScore.toFixed(0)}
                    </span>
                  )}

                  {/* Outcome */}
                  {item.outcome && (
                    <span style={{ fontSize: 11, color: "#a0a0b0" }}>
                      → {item.outcome.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Reasoning */}
                <div style={{ marginTop: 6, fontSize: 12, color: "#6b6b8d", paddingLeft: 82 }}>
                  {item.reasoning}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
