// SOC 2 CC7.2 — Daily chain integrity check
//
// Runs end-to-end hash-chain verification on compliance_audit_log and
// records the result. A break is a P1 alert: either tampering or a bug
// in chain computation. Either way, investigate before continuing to
// rely on the log as SOC 2 evidence.
//
// Schedule: daily (configured in vercel.json or Render cron).
// Auth: Bearer CRON_SECRET.

import { NextResponse } from "next/server";
import { verifyAuditChain } from "@/lib/audit-chain";
import { logAuditEvent, AUDIT_ACTIONS } from "@/lib/audit";

export const maxDuration = 300; // 5 min — chain can be long
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await verifyAuditChain();

  if (!result.ok) {
    await logAuditEvent({
      action: AUDIT_ACTIONS.CHAIN_BREAK_DETECTED,
      severity: "critical",
      metadata: {
        reason: result.first_break_reason ?? "unknown",
        count: result.rows_checked,
      },
      resource: {
        type: "compliance_audit_log",
        // first_break_sequence is a bigint, not a UUID — recorded in metadata
        id: null,
      },
    });

     
    console.error("[audit-chain-verify] CHAIN BREAK", result);

    return NextResponse.json(
      {
        ok: false,
        rows_checked: result.rows_checked,
        first_break_sequence: result.first_break_sequence,
        first_break_reason: result.first_break_reason,
        checked_at: result.checked_at,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    rows_checked: result.rows_checked,
    checked_at: result.checked_at,
  });
}
