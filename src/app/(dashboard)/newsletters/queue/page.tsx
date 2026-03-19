export const dynamic = "force-dynamic";

import { getApprovalQueue } from "@/actions/newsletters";
import { ApprovalQueueClient } from "@/components/newsletters/ApprovalQueueClient";
import Link from "next/link";

export default async function ApprovalQueuePage() {
  const queue = await getApprovalQueue();

  return (
    <div>
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Link href="/newsletters" style={{ fontSize: 13, color: "#4f35d2", textDecoration: "none" }}>{"\u2190"} Back to Dashboard</Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 4, background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Approval Queue
            </h1>
          </div>
          <span className="lf-badge lf-badge-pending">{queue.length} pending</span>
        </div>
      </div>

      <ApprovalQueueClient initialQueue={queue} />
    </div>
  );
}
