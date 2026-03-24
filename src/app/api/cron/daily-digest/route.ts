import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Emails sent in last 24h
    const { count: sentCount } = await supabase
      .from("newsletters")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", yesterday);

    // 2. Pending drafts
    const { count: pendingCount } = await supabase
      .from("newsletters")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft");

    // 3. Hot leads (score > 60 with recent activity)
    const { data: hotLeads } = await supabase
      .from("contacts")
      .select("id, name, email, type, newsletter_intelligence")
      .not("newsletter_intelligence", "is", null)
      .limit(100);

    const hot = (hotLeads || []).filter((c) => {
      const intel = c.newsletter_intelligence as Record<string, unknown> | null;
      return intel && (intel.engagement_score as number) >= 60;
    }).slice(0, 5);

    // 4. Engagement changes (contacts with score changes in last 24h)
    const { data: recentEvents } = await supabase
      .from("newsletter_events")
      .select("newsletter_id, event_type")
      .gte("created_at", yesterday);

    const opensToday = recentEvents?.filter((e) => e.event_type === "opened").length || 0;
    const clicksToday = recentEvents?.filter((e) => e.event_type === "clicked").length || 0;

    // 5. Open rate
    const openRate = sentCount && sentCount > 0 ? Math.round((opensToday / sentCount) * 100) : 0;

    const digest = {
      date: new Date().toISOString().slice(0, 10),
      emails_sent: sentCount || 0,
      pending_drafts: pendingCount || 0,
      opens_today: opensToday,
      clicks_today: clicksToday,
      open_rate: openRate,
      hot_leads: hot.map((c) => ({
        name: c.name,
        type: c.type,
        score: (c.newsletter_intelligence as Record<string, unknown>)?.engagement_score,
      })),
    };

    // TODO: Send digest email via Resend to realtor
    // For now, just return the data

    return NextResponse.json({ success: true, digest });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
