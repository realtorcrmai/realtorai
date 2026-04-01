import { NextRequest, NextResponse } from "next/server";
import { processWorkflowQueue } from "@/lib/workflow-engine";

/**
 * GET /api/cron/process-workflows
 * Unified cron processor for ALL workflow enrollments (including ai_email steps).
 * Replaces both the old workflow processor and processJourneyQueue().
 * Protected by CRON_SECRET bearer token.
 * Call every 2-5 minutes via Vercel Crons or external scheduler.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processWorkflowQueue();

    // Also check for inactive contacts and move to dormant
    let dormantCount = 0;
    try {
      const { checkInactivity } = await import("@/lib/trigger-engine");
      dormantCount = await checkInactivity(60);
    } catch {}

    return NextResponse.json({
      ok: true,
      ...result,
      dormantCount,
      processedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Workflow cron error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Processing failed" },
      { status: 500 }
    );
  }
}
