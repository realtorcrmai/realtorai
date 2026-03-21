export const dynamic = "force-dynamic";

import Link from "next/link";
import { getNewsletterAnalytics } from "@/actions/newsletters";

export default async function NewsletterAnalyticsPage() {
  const analytics = await getNewsletterAnalytics(30);

  const emailTypeLabels: Record<string, string> = {
    new_listing_alert: "Listing Alerts",
    market_update: "Market Updates",
    just_sold: "Just Sold",
    open_house_invite: "Open House",
    neighbourhood_guide: "Neighbourhood Guide",
    home_anniversary: "Home Anniversary",
    welcome: "Welcome",
    reengagement: "Re-engagement",
    referral_ask: "Referral Ask",
  };

  return (
    <div>
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <Link href="/newsletters" style={{ fontSize: 13, color: "#4f35d2", textDecoration: "none" }}>{"\u2190"} Back to Dashboard</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 4, background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Newsletter Analytics
        </h1>
        <p style={{ fontSize: 13, color: "#6b6b8d", marginTop: 2 }}>Last 30 days</p>
      </div>

      {/* Overview Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 18 }}>
        <StatCard label="Sent" value={analytics.sent} emoji={"\u{1F4E8}"} />
        <StatCard label="Opened" value={analytics.opens} emoji={"\u{1F4EC}"} />
        <StatCard label="Clicked" value={analytics.clicks} emoji={"\u{1F517}"} />
        <StatCard label="Open Rate" value={`${analytics.openRate}%`} emoji={"\u{1F4CA}"} color={analytics.openRate > 40 ? "#059669" : "#f59e0b"} />
        <StatCard label="Click Rate" value={`${analytics.clickRate}%`} emoji={"\u{1F3AF}"} color={analytics.clickRate > 10 ? "#059669" : "#f59e0b"} />
      </div>

      {/* Health Indicators */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <div className="lf-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{"\u{2764}\uFE0F"} Deliverability</h3>
          <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: analytics.bounces === 0 ? "#059669" : "#dc2626" }}>{analytics.bounces}</div>
              <div style={{ fontSize: 12, color: "#6b6b8d" }}>Bounces</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: analytics.unsubscribes === 0 ? "#059669" : "#f59e0b" }}>{analytics.unsubscribes}</div>
              <div style={{ fontSize: 12, color: "#6b6b8d" }}>Unsubscribes</div>
            </div>
          </div>
        </div>

        <div className="lf-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{"\u{1F3C6}"} Brand Score</h3>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#4f35d2" }}>
              {calculateBrandScore(analytics)}/100
            </div>
            <div style={{ fontSize: 13, color: "#6b6b8d", marginTop: 2 }}>
              {calculateBrandScore(analytics) > 70 ? "Excellent" : calculateBrandScore(analytics) > 40 ? "Good" : "Needs improvement"}
            </div>
          </div>
        </div>
      </div>

      {/* Performance by Type */}
      <div className="lf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>{"\u{1F4CA}"} Performance by Email Type</h3>
        {Object.keys(analytics.byType).length === 0 ? (
          <p style={{ fontSize: 14, color: "#6b6b8d", textAlign: "center", padding: 20 }}>No data yet. Send some newsletters to see performance breakdown.</p>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 0", borderBottom: "2px solid #e8e5f5", fontSize: 12, fontWeight: 600, color: "#6b6b8d", textTransform: "uppercase" }}>
              <div>Type</div>
              <div style={{ textAlign: "center" }}>Sent</div>
              <div style={{ textAlign: "center" }}>Opens</div>
              <div style={{ textAlign: "center" }}>Clicks</div>
              <div style={{ textAlign: "center" }}>CTR</div>
            </div>
            {Object.entries(analytics.byType).map(([type, data]) => (
              <div key={type} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 0", borderBottom: "1px solid #f0eef8", fontSize: 14 }}>
                <div style={{ fontWeight: 500 }}>{emailTypeLabels[type] || type}</div>
                <div style={{ textAlign: "center" }}>{data.sent}</div>
                <div style={{ textAlign: "center" }}>{data.opens}</div>
                <div style={{ textAlign: "center" }}>{data.clicks}</div>
                <div style={{ textAlign: "center", fontWeight: 600, color: data.sent > 0 && (data.clicks / data.sent) > 0.1 ? "#059669" : "#6b6b8d" }}>
                  {data.sent > 0 ? Math.round((data.clicks / data.sent) * 100) : 0}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function calculateBrandScore(analytics: any): number {
  const openScore = Math.min(40, (analytics.openRate / 100) * 80);
  const clickScore = Math.min(30, (analytics.clickRate / 100) * 150);
  const volumeScore = Math.min(20, (analytics.sent / 100) * 20);
  const healthScore = analytics.bounces === 0 && analytics.unsubscribes === 0 ? 10 : 5;
  return Math.round(openScore + clickScore + volumeScore + healthScore);
}

function StatCard({ label, value, emoji, color }: { label: string; value: string | number; emoji: string; color?: string }) {
  return (
    <div className="lf-card" style={{ padding: 14, textAlign: "center" }}>
      <div style={{ fontSize: 20, marginBottom: 2 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || "#1a1535" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6b6b8d", marginTop: 2 }}>{label}</div>
    </div>
  );
}
