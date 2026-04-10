import { NextRequest, NextResponse } from "next/server";
import { processWelcomeDrip } from "@/actions/drip";

/**
 * Daily cron: process welcome drip emails (D2).
 * Schedule: daily at 9 AM UTC (1-2 AM PST — emails arrive by morning for BC users).
 * Requires: Authorization: Bearer CRON_SECRET
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processWelcomeDrip();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/welcome-drip] Error:", err);
    return NextResponse.json({ error: "Drip processing failed" }, { status: 500 });
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  return POST(request);
}
