"use client";

interface Journey {
  session_id: string;
  pages: { path: string; time: string }[];
  events: { type: string; path: string | null; time: string }[];
  device: string;
  referrer: string;
  duration: number;
}

interface Props {
  activity: {
    contact_id: string;
    source: string;
    journeys: Journey[];
  } | null;
}

const DEVICE_ICONS: Record<string, string> = { desktop: "🖥", mobile: "📱", tablet: "📋", unknown: "❓" };

export function WebsiteActivity({ activity }: Props) {
  if (!activity || activity.journeys.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Website Activity
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {activity.journeys.map(j => (
          <div key={j.session_id} style={{
            padding: 12, borderRadius: 10, background: "rgba(79,53,210,0.04)",
            border: "1px solid rgba(79,53,210,0.08)",
          }}>
            {/* Session header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12, color: "#888" }}>
              <span>{DEVICE_ICONS[j.device] || "❓"}</span>
              <span>{j.referrer ? `From ${j.referrer.replace(/^https?:\/\//, "").split("/")[0]}` : "Direct"}</span>
              <span style={{ color: "#ccc" }}>·</span>
              <span>{j.duration > 0 ? `${Math.floor(j.duration / 60)}m ${j.duration % 60}s` : "<1m"}</span>
              <span style={{ color: "#ccc" }}>·</span>
              <span>{j.pages.length} pages</span>
            </div>

            {/* Page journey */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
              {j.pages.map((p, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {i > 0 && <span style={{ color: "#ccc", fontSize: 10 }}>→</span>}
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 11,
                    background: "#fff", border: "1px solid #e8e8e8",
                    fontFamily: "monospace",
                  }}>
                    {p.path}
                  </span>
                </span>
              ))}
            </div>

            {/* Key events */}
            {j.events.filter(e => e.type !== "page_view").length > 0 && (
              <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                {j.events.filter(e => e.type !== "page_view").map((e, i) => (
                  <span key={i} style={{
                    padding: "2px 6px", borderRadius: 4, fontSize: 10,
                    background: e.type.includes("submit") || e.type.includes("signup")
                      ? "rgba(5,150,105,0.1)" : "rgba(124,92,231,0.1)",
                    color: e.type.includes("submit") || e.type.includes("signup")
                      ? "#059669" : "#7c5ce7",
                    fontWeight: 500,
                  }}>
                    {e.type.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
