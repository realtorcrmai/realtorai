import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runLearningCycle, updateContactIntelligence } from "@/lib/learning-engine";

export const maxDuration = 120;

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const results: Array<{ realtorId: string; adjustments: number; suggestions: number; emails: number }> = [];

    // Get all realtor configs (or create default for demo user)
    const { data: configs } = await supabase
      .from("realtor_agent_config")
      .select("realtor_id");

    const realtorIds = configs?.map((c) => c.realtor_id) || [];

    if (realtorIds.length === 0) {
      return NextResponse.json({
        success: true, realtors: [], contactsUpdated: 0,
        timestamp: new Date().toISOString(),
        reason: "No realtor_agent_config entries found",
      });
    }

    // Run learning cycle for each realtor
    for (const realtorId of realtorIds) {
      const result = await runLearningCycle(realtorId);
      results.push({
        realtorId,
        adjustments: result.autoAdjustments.length,
        suggestions: result.suggestions.length,
        emails: result.metrics.emailsAnalyzed,
      });
    }

    // Update per-contact intelligence for all contacts with journeys
    const { data: journeys } = await supabase
      .from("contact_journeys")
      .select("contact_id")
      .eq("is_paused", false);

    let contactsUpdated = 0;
    if (journeys) {
      for (const j of journeys) {
        await updateContactIntelligence(j.contact_id);
        contactsUpdated++;
      }
    }

    return NextResponse.json({
      success: true,
      realtors: results,
      contactsUpdated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
