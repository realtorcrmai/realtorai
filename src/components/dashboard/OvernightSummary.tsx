"use client";

import { useState, useTransition } from "react";
import { recallSentEmail } from "@/actions/agent-settings";

type OvernightData = {
  period: { from: string; to: string };
  emailsSent: Array<{
    newsletterId: string;
    contactName: string;
    emailType: string;
    subject: string;
    sentAt: string;
    canRecall: boolean;
    recallId?: string;
  }>;
  emailsHeldBack: Array<{
    decisionId: string;
    contactName: string;
    emailType: string;
    reasoning: string;
    relevanceScore: number;
  }>;
  hotLeadAlerts: Array<{
    contactName: string;
    contactId: string;
    action: string;
    timestamp: string;
  }>;
  agentDecisionCounts: { send: number; skip: number; defer: number; suppress: number };
};

export default function OvernightSummary({ data }: { data: OvernightData }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalActivity = data.emailsSent.length + data.emailsHeldBack.length + data.hotLeadAlerts.length;
  if (totalActivity === 0) return null;

  const totalDecisions = Object.values(data.agentDecisionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="lf-card" style={{ padding: 20, marginBottom: 16, borderLeft: "4px solid #4f35d2" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? 16 : 0 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1535", margin: 0 }}>
            {"🤖"} What Your AI Did Overnight
          </h3>
          <p style={{ fontSize: 13, color: "#6b6b8d", margin: "4px 0 0" }}>
            {"📨"} {data.emailsSent.length} sent {"·"} {"🤚"} {data.emailsHeldBack.length} held back {"·"} {"🔥"} {data.hotLeadAlerts.length} hot leads {"·"} {totalDecisions} decisions total
          </p>
        </div>
        <button
          className="lf-btn-sm lf-btn-ghost"
          onClick={() => setExpanded(!expanded)}
          style={{ fontSize: 12 }}
        >
          {expanded ? "Collapse" : "Details"}
        </button>
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Hot Lead Alerts */}
          {data.hotLeadAlerts.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: "#dc2626", margin: "0 0 8px" }}>
                {"🔥"} Hot Leads — Act Now
              </h4>
              {data.hotLeadAlerts.map((alert, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1535", flex: 1 }}>{alert.contactName}</span>
                  <span style={{ fontSize: 13, color: "#dc2626" }}>{alert.action}</span>
                  <a href={`/contacts/${alert.contactId}`} className="lf-btn-sm" style={{ fontSize: 11, textDecoration: "none", background: "#dc2626", color: "#fff", border: "none" }}>
                    View →
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Emails Sent */}
          {data.emailsSent.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: "#059669", margin: "0 0 8px" }}>
                {"📨"} Emails Sent ({data.emailsSent.length})
              </h4>
              {data.emailsSent.map((email, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, marginBottom: 4, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: "#1a1535" }}>{email.contactName}</span>
                  <span style={{ flex: 1, color: "#6b6b8d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.subject}</span>
                  <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>{email.emailType.replace(/_/g, " ")}</span>
                  {email.canRecall && email.recallId && (
                    <button
                      className="lf-btn-sm lf-btn-danger"
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await recallSentEmail(email.recallId!); })}
                      style={{ fontSize: 10 }}
                    >
                      ↩ Recall
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Emails Held Back */}
          {data.emailsHeldBack.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: "#d97706", margin: "0 0 8px" }}>
                {"🤚"} Held Back ({data.emailsHeldBack.length})
              </h4>
              {data.emailsHeldBack.map((held, i) => (
                <div key={i} style={{ padding: "8px 12px", background: "#fffbeb", borderRadius: 8, marginBottom: 4, fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "#1a1535" }}>{held.contactName}</span>
                    <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>{held.emailType?.replace(/_/g, " ") ?? "email"}</span>
                    <span style={{ color: "#6b6b8d", marginLeft: "auto", fontSize: 12 }}>
                      Score: {held.relevanceScore?.toFixed(0) ?? "—"}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#92400e", margin: "4px 0 0" }}>{held.reasoning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
