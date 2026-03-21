import { NextRequest, NextResponse } from "next/server";
import { processJourneyQueue } from "@/actions/journeys";

/**
 * GET /api/newsletters/process
 * Cron endpoint: processes journey queue, sends due emails.
 * Protected by CRON_SECRET header or Vercel Cron signature.
 */
export async function GET(request: NextRequest) {
  // Verify cron authorization
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processJourneyQueue();
    return NextResponse.json({
      ok: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Journey queue processing error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Processing failed" },
      { status: 500 }
    );
  }
}
