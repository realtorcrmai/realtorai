
import Link from "next/link";
import { getSuppressedDecisions } from "@/actions/agent-decisions";
import SuppressionLogClient from "@/components/newsletters/SuppressionLogClient";

export default async function SuppressionsPage() {
  const suppressions = await getSuppressedDecisions({ days: 14 });

  return (
    <div>
      <div className="lf-glass" style={{ padding: "16px 20px", marginBottom: 18, borderRadius: 13 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/newsletters/control" style={{ fontSize: 14, color: "#6b6b8d", textDecoration: "none" }}>← Back</Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {"🤚"} What I Held Back
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "#6b6b8d", margin: 0 }}>
            Emails the AI decided not to send — review and override if needed
          </p>
        </div>
      </div>
      <SuppressionLogClient initialData={suppressions} />
    </div>
  );
}
