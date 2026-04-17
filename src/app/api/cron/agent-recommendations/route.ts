import { NextRequest, NextResponse } from "next/server";
import { generateRecommendations, saveRecommendations } from "@/lib/ai-agent/next-best-action";
import { trackEvent } from "@/lib/analytics";

/**
 * GET /api/cron/agent-recommendations
 * Runs hourly. Generates AI-powered next-best-action recommendations.
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronStart = Date.now();
  try {
    const recs = await generateRecommendations();
    const saved = await saveRecommendations(recs);

    await trackEvent('cron_run', null, {
      cron: 'agent-recommendations',
      status: 'success',
      duration_ms: Date.now() - cronStart,
    });

    return NextResponse.json({
      ok: true,
      generated: recs.length,
      saved,
      processedAt: new Date().toISOString(),
    });
  } catch (e) {
    await trackEvent('cron_run', null, {
      cron: 'agent-recommendations',
      status: 'error',
      duration_ms: Date.now() - cronStart,
      error: e instanceof Error ? e.message : 'Unknown error',
    });
    console.error("Agent recommendations error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
