export const dynamic = "force-dynamic";

import Link from "next/link";
import { getActivityFeed } from "@/actions/agent-decisions";
import AgentActivityClient from "@/components/newsletters/AgentActivityClient";

export default async function ActivityPage() {
  const feed = await getActivityFeed({ days: 7 });

  return (
    <div>
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/newsletters/control" style={{ fontSize: 14, color: "#6b6b8d", textDecoration: "none" }}>← Back</Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {"🤖"} Agent Activity Feed
            </h1>
          </div>
        </div>
      </div>
      <AgentActivityClient initialFeed={feed} />
    </div>
  );
}
