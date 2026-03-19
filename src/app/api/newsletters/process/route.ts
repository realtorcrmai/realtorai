import { NextResponse } from "next/server";
import { processJourneyQueue } from "@/actions/journeys";

/**
 * GET /api/newsletters/process
 * Cron endpoint: processes journey queue, sends due emails.
 * Call every 5 minutes via cron or external scheduler.
 */
export async function GET() {
  try {
    const result = await processJourneyQueue();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("Journey queue processing error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Processing failed" },
      { status: 500 }
    );
  }
}
