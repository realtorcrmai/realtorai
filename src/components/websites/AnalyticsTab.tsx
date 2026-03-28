"use client";

interface Props {
  analytics: {
    totalEvents: number;
    totalSessions: number;
    todayEvents: number;
    weekEvents: number;
    topPages: { path: string; count: number }[];
    devices: Record<string, number>;
    topReferrers: { source: string; count: number }[];
    dailyVisitors: { date: string; visitors: number }[];
    typeCounts: Record<string, number>;
    funnel: {
      pageViews: number;
      formStarts: number;
      formSubmits: number;
      chatOpens: number;
      chatMessages: number;
      leadsCreated: number;
    };
    avgDuration: number;
    bounceRate: number;
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function AnalyticsTab({ analytics }: Props) {
  const { totalEvents, totalSessions, todayEvents, weekEvents, topPages, devices, topReferrers, dailyVisitors, typeCounts, funnel, avgDuration, bounceRate } = analytics;
  const maxDaily = Math.max(...dailyVisitors.map(d => d.visitors), 1);

  const hasData = totalEvents > 0;

  if (!hasData) {
    return (
      <div className="lf-card" style={{ padding: 48, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>No Analytics Data Yet</h3>
        <p style={{ fontSize: 14, color: "#888", margin: "0 0 16px", maxWidth: 400, marginInline: "auto", lineHeight: 1.5 }}>
          Add the ListingFlow SDK to your website to start tracking visitors, page views, and lead conversions.
        </p>
        <p style={{ fontSize: 13, color: "#aaa" }}>
          Go to the <strong>Integration Codes</strong> tab to get your embed snippet.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Today", value: todayEvents, color: "#4f35d2", icon: "📅" },
          { label: "This Week", value: weekEvents, color: "#00bfa5", icon: "📆" },
          { label: "Sessions", value: totalSessions, color: "#ff5c3a", icon: "👤" },
          { label: "Events", value: totalEvents, color: "#059669", icon: "⚡" },
          { label: "Avg Duration", value: formatDuration(avgDuration), color: "#7c5ce7", icon: "⏱" },
          { label: "Bounce Rate", value: `${bounceRate}%`, color: bounceRate > 60 ? "#ff5c3a" : "#059669", icon: "↩️" },
        ].map(s => (
          <div key={s.label} className="lf-card" style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lead Funnel */}
      <div className="lf-card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px" }}>Lead Conversion Funnel</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[
            { label: "Page Views", value: funnel.pageViews, color: "#4f35d2" },
            { label: "Chat Opens", value: funnel.chatOpens, color: "#7c5ce7" },
            { label: "Form Starts", value: funnel.formStarts, color: "#00bfa5" },
            { label: "Submissions", value: funnel.formSubmits, color: "#059669" },
            { label: "Leads Created", value: funnel.leadsCreated, color: "#ff5c3a" },
          ].map((step, i, arr) => {
            const maxVal = Math.max(...arr.map(a => a.value), 1);
            const width = Math.max(20, (step.value / maxVal) * 100);
            const convRate = i > 0 && arr[i - 1].value > 0
              ? Math.round((step.value / arr[i - 1].value) * 100)
              : null;
            return (
              <div key={step.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {/* Arrow connector */}
                {i > 0 && (
                  <div style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#ccc" }}>›</div>
                )}
                {/* Bar */}
                <div style={{
                  width: `${width}%`, minWidth: 40, height: 48,
                  background: step.color, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 18,
                  transition: "width 0.5s",
                }}>
                  {step.value}
                </div>
                {/* Label */}
                <div style={{ fontSize: 11, color: "#888", marginTop: 6, textAlign: "center" }}>{step.label}</div>
                {/* Conversion rate */}
                {convRate !== null && convRate > 0 && (
                  <div style={{ fontSize: 10, color: "#059669", marginTop: 2 }}>{convRate}%</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily visitors chart */}
      <div className="lf-card" style={{ padding: 18, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Daily Visitors</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
          {dailyVisitors.slice(-30).map(d => (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: "100%", minHeight: 4,
                  height: `${(d.visitors / maxDaily) * 100}px`,
                  background: "linear-gradient(to top, #4f35d2, #7c5ce7)",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 0.3s",
                }}
                title={`${d.date}: ${d.visitors} visitors`}
              />
            </div>
          ))}
        </div>
        {dailyVisitors.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#999", marginTop: 4 }}>
            <span>{dailyVisitors[0]?.date.slice(5)}</span>
            <span>{dailyVisitors[dailyVisitors.length - 1]?.date.slice(5)}</span>
          </div>
        )}
      </div>

      {/* Three-column: Top Pages + Referrers + Devices */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {/* Top Pages */}
        <div className="lf-card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Top Pages</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topPages.slice(0, 8).map((p, i) => (
              <div key={p.path} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ color: "#999", width: 16, textAlign: "right", fontSize: 11 }}>{i + 1}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12 }}>
                  {p.path}
                </span>
                <span style={{ fontWeight: 600, color: "#4f35d2", fontSize: 12 }}>{p.count}</span>
              </div>
            ))}
            {topPages.length === 0 && <div style={{ color: "#999", fontSize: 13, textAlign: "center", padding: 8 }}>No data</div>}
          </div>
        </div>

        {/* Referrers */}
        <div className="lf-card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Traffic Sources</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {topReferrers.slice(0, 8).map((r, i) => (
              <div key={r.source} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ color: "#999", width: 16, textAlign: "right", fontSize: 11 }}>{i + 1}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.source}
                </span>
                <span style={{ fontWeight: 600, color: "#00bfa5", fontSize: 12 }}>{r.count}</span>
              </div>
            ))}
            {topReferrers.length === 0 && <div style={{ color: "#999", fontSize: 13, textAlign: "center", padding: 8 }}>No data</div>}
          </div>
        </div>

        {/* Device breakdown */}
        <div className="lf-card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Devices</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(devices).length === 0 ? (
              <div style={{ color: "#999", fontSize: 13, textAlign: "center", padding: 8 }}>No data</div>
            ) : (
              Object.entries(devices).sort((a, b) => b[1] - a[1]).map(([device, count]) => {
                const total = Object.values(devices).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const icon = device === "desktop" ? "🖥" : device === "mobile" ? "📱" : device === "tablet" ? "📋" : "❓";
                return (
                  <div key={device}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{icon} <span style={{ textTransform: "capitalize" }}>{device}</span></span>
                      <span style={{ fontWeight: 600 }}>{pct}% <span style={{ fontWeight: 400, color: "#999", fontSize: 11 }}>({count})</span></span>
                    </div>
                    <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: device === "desktop" ? "#4f35d2" : device === "mobile" ? "#ff5c3a" : "#00bfa5", borderRadius: 3, transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Event breakdown */}
      <div className="lf-card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>All Event Types</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <div key={type} style={{
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(79,53,210,0.06)", fontSize: 13,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{type}</span>
              <span style={{ fontWeight: 700, color: "#4f35d2" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
