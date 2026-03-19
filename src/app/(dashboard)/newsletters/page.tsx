export const dynamic = "force-dynamic";

import Link from "next/link";
import { getJourneyDashboard } from "@/actions/journeys";
import { getApprovalQueue } from "@/actions/newsletters";

export default async function NewsletterDashboard() {
  const dashboard = await getJourneyDashboard();
  const queue = await getApprovalQueue();

  const phases = ["lead", "active", "under_contract", "past_client", "dormant"];
  const phaseLabels: Record<string, string> = {
    lead: "New Leads",
    active: "Active",
    under_contract: "Under Contract",
    past_client: "Past Clients",
    dormant: "Dormant",
  };
  const phaseEmoji: Record<string, string> = {
    lead: "\u{1F7E2}",
    active: "\u{1F525}",
    under_contract: "\u{1F4DD}",
    past_client: "\u{2B50}",
    dormant: "\u{2744}\uFE0F",
  };

  return (
    <div>
      {/* Header */}
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Newsletter & Journeys
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/newsletters/queue" className="lf-btn-sm lf-btn-ghost" style={{ textDecoration: "none" }}>
              {"\u{1F4EC}"} Queue ({queue.length})
            </Link>
            <Link href="/newsletters/analytics" className="lf-btn-sm lf-btn-ghost" style={{ textDecoration: "none" }}>
              {"\u{1F4CA}"} Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
        <StatCard label="Total Contacts" value={dashboard.totalContacts} emoji={"\u{1F465}"} />
        <StatCard label="Emails Sent" value={dashboard.totalSent} emoji={"\u{1F4E7}"} />
        <StatCard label="Open Rate" value={`${dashboard.openRate}%`} emoji={"\u{1F4EC}"} color={dashboard.openRate > 40 ? "#059669" : "#f59e0b"} />
        <StatCard label="Click Rate" value={`${dashboard.clickRate}%`} emoji={"\u{1F517}"} color={dashboard.clickRate > 10 ? "#059669" : "#f59e0b"} />
      </div>

      {/* Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div className="lf-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{"\u{1F3E0}"} Buyer Pipeline</h3>
          {phases.map(p => (
            <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0eef8" }}>
              <span style={{ fontSize: 14 }}>{phaseEmoji[p]} {phaseLabels[p]}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#4f35d2" }}>{dashboard.buyerPhases[p] || 0}</span>
            </div>
          ))}
        </div>
        <div className="lf-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{"\u{1F3D7}\uFE0F"} Seller Pipeline</h3>
          {phases.map(p => (
            <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0eef8" }}>
              <span style={{ fontSize: 14 }}>{phaseEmoji[p]} {phaseLabels[p]}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#4f35d2" }}>{dashboard.sellerPhases[p] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approvals */}
      {queue.length > 0 && (
        <div className="lf-card" style={{ padding: 20, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>{"\u{1F4EC}"} Pending Approvals</h3>
            <Link href="/newsletters/queue" style={{ fontSize: 13, color: "#4f35d2", textDecoration: "none" }}>View All →</Link>
          </div>
          {queue.slice(0, 3).map((n: any) => (
            <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0eef8" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{n.contacts?.name || "Unknown"}</div>
                <div style={{ fontSize: 13, color: "#6b6b8d" }}>{n.subject}</div>
              </div>
              <span className="lf-badge lf-badge-pending" style={{ fontSize: 11 }}>{n.email_type.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="lf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{"\u{1F4E8}"} Recent Activity</h3>
        {dashboard.recentEvents.length === 0 ? (
          <p style={{ fontSize: 14, color: "#6b6b8d", textAlign: "center", padding: 20 }}>No newsletter activity yet. Enroll contacts in journeys to get started!</p>
        ) : (
          dashboard.recentEvents.slice(0, 10).map((event: any) => (
            <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0eef8" }}>
              <span style={{ fontSize: 16 }}>
                {event.event_type === "opened" ? "\u{1F4E9}" : event.event_type === "clicked" ? "\u{1F517}" : event.event_type === "bounced" ? "\u{26A0}\uFE0F" : "\u{1F4E4}"}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{event.contacts?.name}</span>
                <span style={{ fontSize: 13, color: "#6b6b8d" }}> {event.event_type} </span>
                <span style={{ fontSize: 13, color: "#6b6b8d" }}>{event.newsletters?.subject}</span>
              </div>
              <span style={{ fontSize: 11, color: "#a0a0b0" }}>
                {new Date(event.created_at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, emoji, color }: { label: string; value: string | number; emoji: string; color?: string }) {
  return (
    <div className="lf-card" style={{ padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#1a1535" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b6b8d", marginTop: 2 }}>{label}</div>
    </div>
  );
}
