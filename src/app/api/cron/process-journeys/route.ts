import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/cron/process-journeys
 * Runs the journey queue processor — sends due journey emails for all active contacts.
 * Protected by CRON_SECRET bearer token.
 * Scheduled daily at 9:00 AM UTC via vercel.json.
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
    const { processJourneyQueue } = await import("@/actions/journeys");
    const result = await processJourneyQueue();
    return NextResponse.json({
      ok: true,
      processed: (result as { processed?: number }).processed ?? 0,
      debug: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/process-journeys] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error", stack: err instanceof Error ? err.stack : undefined },
      { status: 500 }
    );
  }
}
