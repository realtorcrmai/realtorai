"use client";

import { useState } from "react";

interface Session {
  session_id: string;
  pages_visited: string[];
  page_count: number;
  event_count: number;
  device_type: string;
  referrer: string;
  duration_seconds: number;
  is_converted: boolean;
  has_chat: boolean;
  started_at: string;
}

interface Props {
  sessions: Session[];
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = Math.round((now.getTime() - d.getTime()) / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  if (diffH < 48) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DEVICE_ICONS: Record<string, string> = { desktop: "🖥", mobile: "📱", tablet: "📋", unknown: "❓" };

export function SessionsTab({ sessions }: Props) {
  const [filter, setFilter] = useState<"all" | "converted" | "chat">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = sessions.filter(s => {
    if (filter === "converted") return s.is_converted;
    if (filter === "chat") return s.has_chat;
    return true;
  });

  const convertedCount = sessions.filter(s => s.is_converted).length;
  const chatCount = sessions.filter(s => s.has_chat).length;

  if (sessions.length === 0) {
    return (
      <div className="lf-card" style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👁</div>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>No Sessions Yet</h3>
        <p style={{ fontSize: 14, color: "#888", margin: 0, maxWidth: 400, marginInline: "auto", lineHeight: 1.5 }}>
          Session data appears once visitors browse your website with the SDK installed.
          Each unique browser session is tracked with pages visited, duration, and conversion status.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total Sessions", value: sessions.length, color: "#4f35d2" },
          { label: "Converted", value: convertedCount, color: "#059669" },
          { label: "Used Chat", value: chatCount, color: "#7c5ce7" },
          { label: "Conversion Rate", value: sessions.length > 0 ? `${Math.round((convertedCount / sessions.length) * 100)}%` : "0%", color: "#ff5c3a" },
        ].map(s => (
          <div key={s.label} className="lf-card" style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {([
          { id: "all" as const, label: `All (${sessions.length})` },
          { id: "converted" as const, label: `Converted (${convertedCount})` },
          { id: "chat" as const, label: `Used Chat (${chatCount})` },
        ]).map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "5px 14px", borderRadius: 16, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: filter === f.id ? 600 : 400,
              background: filter === f.id ? "#4f35d2" : "rgba(79,53,210,0.08)",
              color: filter === f.id ? "#fff" : "#4f35d2",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(s => {
          const isExpanded = expanded === s.session_id;
          return (
            <div key={s.session_id} className="lf-card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Session header */}
              <div
                onClick={() => setExpanded(isExpanded ? null : s.session_id)}
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                }}
              >
                {/* Device icon */}
                <span style={{ fontSize: 20 }}>{DEVICE_ICONS[s.device_type] || "❓"}</span>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500 }}>
                    <span>{s.page_count} page{s.page_count !== 1 ? "s" : ""}</span>
                    <span style={{ color: "#ccc" }}>·</span>
                    <span style={{ color: "#888" }}>{formatDuration(s.duration_seconds)}</span>
                    <span style={{ color: "#ccc" }}>·</span>
                    <span style={{ color: "#888" }}>{s.event_count} events</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                    {s.referrer ? `From: ${s.referrer.replace(/^https?:\/\//, "").split("/")[0]}` : "Direct visit"}
                    {" · "}{formatTime(s.started_at)}
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {s.is_converted && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(5,150,105,0.1)", color: "#059669", fontWeight: 600 }}>
                      Converted
                    </span>
                  )}
                  {s.has_chat && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(124,92,231,0.1)", color: "#7c5ce7", fontWeight: 600 }}>
                      Chat
                    </span>
                  )}
                </div>

                {/* Expand arrow */}
                <span style={{ fontSize: 14, color: "#ccc", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
              </div>

              {/* Expanded: page journey */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "12px 16px", background: "rgba(0,0,0,0.01)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8 }}>Visitor Journey</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {s.pages_visited.map((page, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: i === 0 ? "#4f35d2" : i === s.pages_visited.length - 1 ? "#ff5c3a" : "#e0e0e0",
                          color: i === 0 || i === s.pages_visited.length - 1 ? "#fff" : "#999",
                          fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        {i > 0 && (
                          <div style={{ position: "absolute", marginLeft: 9, marginTop: -16, width: 2, height: 12, background: "#e0e0e0" }} />
                        )}
                        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{page}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, fontSize: 11, color: "#aaa" }}>
                    Session ID: <code style={{ fontSize: 10 }}>{s.session_id}</code>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
