import { createAdminClient } from "@/lib/supabase/admin";
import { scoreBatch } from "@/lib/ai-agent/lead-scorer";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/cron/score-contacts
 * Daily at 6 AM. Scores contacts who have journey emails due in the next 24h
 * (priority) plus any contacts with stale scores (>24h). This ensures the
 * AI has fresh lead scores before processJourneyQueue runs at 9 AM.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Priority: contacts with journey emails due in next 24h
    const { data: dueJourneys } = await supabase
      .from("contact_journeys")
      .select("contact_id")
      .eq("is_paused", false)
      .not("next_email_at", "is", null)
      .lte("next_email_at", new Date(Date.now() + 24 * 3600000).toISOString())
      .gte("next_email_at", new Date().toISOString())
      .limit(30);

    const priorityIds: string[] = [
      ...new Set((dueJourneys ?? []).map((j: { contact_id: string }) => j.contact_id)),
    ];

    // Also score contacts with stale scores (not scored in 24h)
    const cutoff = new Date(Date.now() - 24 * 3600000).toISOString();
    const { data: staleContacts } = await supabase
      .from("contacts")
      .select("id")
      .or(`ai_lead_score.is.null,ai_lead_score->>scored_at.lt.${cutoff}`)
      .limit(20);

    const staleIds = (staleContacts ?? [])
      .map((c: { id: string }) => c.id)
      .filter((id) => !priorityIds.includes(id));

    // Give priority contacts their own cap (30) so stale contacts always get
    // at least 20 slots even when there are many priority items.
    const priority = priorityIds.slice(0, 30);
    const staleSlots = 50 - priority.length;
    const stale = staleIds.filter(id => !new Set(priority).has(id)).slice(0, staleSlots);
    const allIds = [...priority, ...stale];

    if (allIds.length === 0) {
      return NextResponse.json({ scored: 0, message: "No contacts need scoring" });
    }

    const result = await scoreBatch(allIds);

    return NextResponse.json({
      ...result,
      priorityCount: priorityIds.length,
      staleCount: staleIds.length,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/score-contacts]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
