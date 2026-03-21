import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreBatch } from "@/lib/ai-agent/lead-scorer";

/**
 * GET /api/cron/agent-scoring
 * Runs every 15 minutes. Scores contacts with recent activity or stale scores.
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const supabase = createAdminClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

    // Find contacts that need scoring:
    // 1. Have recent activity (last 7 days) but score is stale (>24h) or missing
    const { data: recentlyActive } = await supabase
      .from("contacts")
      .select("id, ai_lead_score")
      .not("email", "is", null)
      .eq("newsletter_unsubscribed", false)
      .order("updated_at", { ascending: false })
      .limit(50);

    const contactsToScore = (recentlyActive || []).filter(c => {
      const score = c.ai_lead_score as Record<string, any> | null;
      if (!score || !score.scored_at) return true; // Never scored
      return new Date(score.scored_at) < new Date(oneDayAgo); // Stale (>24h)
    }).map(c => c.id);

    if (contactsToScore.length === 0) {
      return NextResponse.json({ ok: true, scored: 0, message: "No contacts need scoring" });
    }

    const result = await scoreBatch(contactsToScore);

    // Expire old recommendations
    await supabase
      .from("agent_recommendations")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    return NextResponse.json({
      ok: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Agent scoring error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Scoring failed" },
      { status: 500 }
    );
  }
}
