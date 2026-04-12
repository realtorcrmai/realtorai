
import Link from "next/link";
import { getAgentInsights } from "@/actions/agent-decisions";
import { evaluateTrustPromotion } from "@/lib/ai-agent/trust-manager";

export default async function InsightsPage() {
  let insights: any;
  let promotion: any;

  try {
    [insights, promotion] = await Promise.all([
      getAgentInsights(30),
      evaluateTrustPromotion(),
    ]);
  } catch {
    insights = { editRateTrend: [], approvalRateTrend: [], totalDecisions: 0, editRate: 0, topPerformingEmailTypes: [] };
    promotion = { eligible: false, currentLevel: "ghost", metrics: { emailsAtCurrentLevel: 0, editRate: 0, approvalRate: 0 } };
  }

  return (
    <div>
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/newsletters/control" style={{ fontSize: 14, color: "#6b6b8d", textDecoration: "none" }}>← Back</Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {"📊"} Agent Insights & Learning
            </h1>
          </div>
        </div>
      </div>

      {/* Trust Promotion Banner */}
      {promotion.eligible && (
        <div className="lf-card" style={{ padding: 20, marginBottom: 16, borderLeft: "4px solid #059669", background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#059669", margin: "0 0 8px" }}>
            {"🎓"} Ready to Level Up!
          </h3>
          <p style={{ fontSize: 14, color: "#1a1535", margin: "0 0 8px" }}>
            Your agent has processed {promotion.metrics.emailsAtCurrentLevel} emails at <strong>{promotion.currentLevel}</strong> level
            with a {(promotion.metrics.editRate * 100).toFixed(1)}% edit rate and {(promotion.metrics.approvalRate * 100).toFixed(1)}% approval rate.
          </p>
          <p style={{ fontSize: 13, color: "#6b6b8d", margin: 0 }}>
            Eligible to promote to <strong>{promotion.suggestedLevel}</strong>.
            Go to Command Center → Agent Trust tab to upgrade.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 18 }}>
        <StatCard emoji={"🤖"} label="Total Decisions" value={insights.totalDecisions} />
        <StatCard emoji={"✏️"} label="Edit Rate" value={`${(insights.editRate * 100).toFixed(1)}%`} trend={insights.editRate < 0.15 ? "good" : "warning"} />
        <StatCard emoji={"📬"} label="Current Level" value={promotion.currentLevel} />
        <StatCard emoji={"📧"} label="Emails at Level" value={promotion.metrics.emailsAtCurrentLevel} />
      </div>

      {/* Edit Rate Trend */}
      {insights.editRateTrend.length > 0 && (
        <div className="lf-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a1535", margin: "0 0 12px" }}>
            {"📉"} Edit Rate Over Time
          </h3>
          <p style={{ fontSize: 13, color: "#6b6b8d", margin: "0 0 12px" }}>
            Lower is better — means the AI is matching your voice
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {insights.editRateTrend.map((week: any, i: number) => {
              const height = Math.max(8, week.rate * 300);
              const isDecline = i > 0 && week.rate < insights.editRateTrend[i - 1].rate;
              return (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height,
                    background: isDecline ? "linear-gradient(180deg, #059669, #34d399)" : "linear-gradient(180deg, #4f35d2, #8b5cf6)",
                    borderRadius: "4px 4px 0 0",
                    transition: "height 0.3s",
                  }} />
                  <div style={{ fontSize: 10, color: "#6b6b8d", marginTop: 4 }}>
                    {(week.rate * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 9, color: "#a0a0b0" }}>
                    {new Date(week.week).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Performing Email Types */}
      {insights.topPerformingEmailTypes.length > 0 && (
        <div className="lf-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a1535", margin: "0 0 12px" }}>
            {"🏆"} Top Performing Email Types
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {insights.topPerformingEmailTypes.map((type: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "#f9f8ff", borderRadius: 8 }}>
                <span style={{ fontSize: 16, width: 24 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1a1535" }}>
                  {type.type.replace(/_/g, " ")}
                </span>
                <span style={{ fontSize: 13, color: "#6b6b8d" }}>{type.sent} sent</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>
                  {type.openRate.toFixed(0)}% open
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Learning */}
      <div className="lf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1a1535", margin: "0 0 8px" }}>
          {"🎤"} Voice Learning
        </h3>
        <p style={{ fontSize: 13, color: "#6b6b8d", margin: "0 0 12px" }}>
          The AI learns your writing style from edits you make to drafts.
          {insights.totalEdited > 0
            ? ` ${insights.totalEdited} edits analyzed so far.`
            : " Start editing AI drafts in the approval queue to train your voice."}
        </p>
        <Link
          href="/newsletters/queue"
          className="lf-btn-sm"
          style={{ textDecoration: "none", background: "#4f35d2", color: "#fff", border: "none", fontSize: 13 }}
        >
          Go to Approval Queue →
        </Link>
      </div>
    </div>
  );
}

function StatCard({ emoji, label, value, trend }: { emoji: string; label: string; value: string | number; trend?: string }) {
  return (
    <div className="lf-card" style={{ padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: trend === "good" ? "#059669" : trend === "warning" ? "#d97706" : "#1a1535" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#6b6b8d" }}>{label}</div>
    </div>
  );
}
