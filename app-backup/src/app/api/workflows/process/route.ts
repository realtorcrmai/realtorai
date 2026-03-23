import { processWorkflowQueue } from "@/lib/workflow-engine";
import { NextResponse } from "next/server";

/**
 * POST /api/workflows/process
 *
 * Processes all pending workflow enrollments.
 * Should be called by a cron job every 1-2 minutes.
 *
 * Security: Protected by CRON_SECRET header.
 */
export async function POST(request: Request) {
  // Verify cron secret (optional, for production security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processWorkflowQueue();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Workflow processor error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/process
 *
 * Health check / status endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "workflow-processor",
    timestamp: new Date().toISOString(),
  });
}
