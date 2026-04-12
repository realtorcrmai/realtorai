
import Link from "next/link";
import { getGhostComparisons } from "@/actions/agent-decisions";

export default async function GhostPage() {
  const { matchRate, comparisons } = await getGhostComparisons(14);

  return (
    <div>
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/newsletters/control" style={{ fontSize: 14, color: "#6b6b8d", textDecoration: "none" }}>← Back</Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {"👻"} Ghost Mode — What AI Would Have Sent
            </h1>
          </div>
        </div>
      </div>

      {/* Match Rate */}
      <div className="lf-card" style={{ padding: 20, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: "#4f35d2" }}>
          {(matchRate * 100).toFixed(0)}%
        </div>
        <div style={{ fontSize: 14, color: "#6b6b8d" }}>
          Match Rate — How often the AI agreed with what you actually sent
        </div>
        <div style={{ fontSize: 13, color: "#a0a0b0", marginTop: 4 }}>
          {comparisons.length} ghost drafts in the last 14 days
        </div>
      </div>

      {comparisons.length === 0 ? (
        <div className="lf-card" style={{ padding: 40, textAlign: "center", color: "#6b6b8d" }}>
          {"👻"} No ghost drafts yet. The AI agent will start creating ghost drafts when trust level is set to Ghost mode.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {comparisons.map((comp, i) => (
            <div key={i} className="lf-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {/* Ghost Draft */}
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#4f35d2", marginBottom: 6 }}>
                    {"👻"} AI Would Have Sent
                  </div>
                  <div style={{ padding: 12, background: "#f6f5ff", borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1535" }}>
                      To: {comp.ghostDraft.contactName}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535", margin: "4px 0" }}>
                      {comp.ghostDraft.subject}
                    </div>
                    <span className="lf-badge lf-badge-info" style={{ fontSize: 10 }}>
                      {comp.ghostDraft.emailType?.replace(/_/g, " ")}
                    </span>
                    <p style={{ fontSize: 12, color: "#6b6b8d", margin: "8px 0 0" }}>
                      Reasoning: {comp.ghostDraft.reasoning}
                    </p>
                  </div>
                </div>

                {/* Actual Email */}
                <div style={{ flex: 1, minWidth: 250 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: comp.actualEmail ? "#059669" : "#dc2626", marginBottom: 6 }}>
                    {comp.actualEmail ? "📧 You Actually Sent" : "❌ No Email Sent"}
                  </div>
                  {comp.actualEmail ? (
                    <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1535", margin: "4px 0" }}>
                        {comp.actualEmail.subject}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b6b8d" }}>
                        Sent: {new Date(comp.actualEmail.sentAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 12, background: "#fef2f2", borderRadius: 8 }}>
                      <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>
                        Missed opportunity — the AI would have emailed {comp.ghostDraft.contactName} but no manual email was sent within 48 hours.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#a0a0b0", marginTop: 8 }}>
                Ghost draft created: {new Date(comp.ghostDraft.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
