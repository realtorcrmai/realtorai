"use client";

import { useState, useTransition } from "react";
import type { SuppressionRow } from "@/actions/agent-decisions";
import { sendAnyway } from "@/actions/agent-decisions";

const DECISION_STYLE: Record<string, { bg: string; color: string; emoji: string }> = {
  skip: { bg: "#fef9c3", color: "#ca8a04", emoji: "⏭" },
  defer: { bg: "#ffedd5", color: "#ea580c", emoji: "⏸" },
  suppress: { bg: "#fecaca", color: "#dc2626", emoji: "🚫" },
};

export default function SuppressionLogClient({ initialData }: { initialData: SuppressionRow[] }) {
  const [filter, setFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const filtered = initialData.filter((item) => {
    if (filter !== "all" && item.decision !== filter) return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="lf-card" style={{ padding: "12px 16px", marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <select className="lf-select" style={{ width: "auto", fontSize: 13 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="skip">Skipped</option>
          <option value="defer">Deferred</option>
          <option value="suppress">Suppressed</option>
        </select>
        <span style={{ fontSize: 13, color: "#6b6b8d", marginLeft: "auto" }}>
          {filtered.length} held back (last 14 days)
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center", color: "#6b6b8d" }}>
          {"✅"} No suppressed emails — the agent sent everything it wanted to
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((item) => {
            const style = DECISION_STYLE[item.decision] ?? DECISION_STYLE.skip;
            const alreadySent = sentIds.has(item.id);
            return (
              <div key={item.id} className="lf-card" style={{ padding: "14px 16px", borderLeft: `3px solid ${style.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: style.bg, color: style.color }}>
                    {style.emoji} {item.decision}
                  </span>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
                    background: item.contactType === "seller" ? "linear-gradient(135deg, #4f35d2, #ff5c3a)" : "linear-gradient(135deg, #4f35d2, #8b5cf6)",
                  }}>
                    {item.contactName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1535" }}>{item.contactName}</span>
                  {item.emailType && (
                    <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>{item.emailType.replace(/_/g, " ")}</span>
                  )}
                  {item.relevanceScore != null && (
                    <span style={{ fontSize: 12, color: "#6b6b8d" }}>Score: {item.relevanceScore.toFixed(0)}</span>
                  )}
                  <span style={{ fontSize: 11, color: "#a0a0b0", marginLeft: "auto" }}>
                    {new Date(item.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#6b6b8d", margin: "0 0 8px 0", paddingLeft: 2 }}>
                  {item.reasoning}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {alreadySent ? (
                    <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>{"✓"} Queued for sending</span>
                  ) : (
                    <button
                      className="lf-btn-sm"
                      disabled={isPending}
                      onClick={() => startTransition(async () => {
                        await sendAnyway(item.id);
                        setSentIds((prev) => new Set(prev).add(item.id));
                      })}
                      style={{ fontSize: 12, background: "#4f35d2", color: "#fff", border: "none" }}
                    >
                      Send Anyway
                    </button>
                  )}
                  <a
                    href={`/contacts/${item.contactId}`}
                    className="lf-btn-sm lf-btn-ghost"
                    style={{ fontSize: 12, textDecoration: "none" }}
                  >
                    View Contact
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
