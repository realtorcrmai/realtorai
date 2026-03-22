export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  getEmailActivityFeed,
  getWorkflowCommandCenter,
  getContactJourneyTracker,
  getScheduleOverview,
} from "@/actions/control-panel";
import ControlPanelClient from "@/components/newsletters/ControlPanelClient";

export default async function ControlPanelPage() {
  const [emailActivity, workflows, journeys, schedule] = await Promise.all([
    getEmailActivityFeed(),
    getWorkflowCommandCenter(),
    getContactJourneyTracker(),
    getScheduleOverview(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/newsletters"
              style={{ fontSize: 14, color: "#6b6b8d", textDecoration: "none" }}
            >
              ← Back
            </Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {"🎛️"} Command Center
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/newsletters/queue" className="lf-btn-sm lf-btn-ghost" style={{ textDecoration: "none", fontSize: 13 }}>
              {"📬"} Queue
            </Link>
            <Link href="/newsletters/analytics" className="lf-btn-sm lf-btn-ghost" style={{ textDecoration: "none", fontSize: 13 }}>
              {"📊"} Analytics
            </Link>
          </div>
        </div>
      </div>

      <ControlPanelClient
        initialEmailActivity={emailActivity}
        initialWorkflows={workflows}
        initialJourneys={journeys}
        initialSchedule={schedule}
      />
    </div>
  );
}
