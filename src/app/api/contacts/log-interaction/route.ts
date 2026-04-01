import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contactId, channel, triggeredByNewsletterId, notes, outcome, scoreImpact } = body;

    if (!contactId || !channel) {
      return NextResponse.json({ error: "contactId and channel required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Log to communications
    await supabase.from("communications").insert({
      contact_id: contactId,
      direction: channel.startsWith("call_inbound") ? "inbound" : "outbound",
      channel: channel.replace("_inbound", "").replace("_outbound", ""),
      body: notes || `${channel} interaction logged`,
      triggered_by_newsletter_id: triggeredByNewsletterId || null,
    });

    // 2. Update engagement score
    if (scoreImpact && scoreImpact > 0) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("newsletter_intelligence")
        .eq("id", contactId)
        .single();

      if (contact) {
        const intel = (contact.newsletter_intelligence as Record<string, unknown>) || {};
        const currentScore = (intel.engagement_score as number) || 0;
        const newScore = Math.min(100, currentScore + scoreImpact);

        await supabase
          .from("contacts")
          .update({
            newsletter_intelligence: {
              ...intel,
              engagement_score: newScore,
              last_direct_contact: new Date().toISOString(),
              last_direct_contact_type: channel,
              last_direct_contact_outcome: outcome,
            },
          })
          .eq("id", contactId);
      }
    }

    // 3. Log outcome event for attribution
    await supabase.from("outcome_events").insert({
      contact_id: contactId,
      event_type: "direct_contact",
      newsletter_id: triggeredByNewsletterId || null,
      metadata: { channel, notes, outcome, score_impact: scoreImpact },
    });

    // 4. Log activity
    await supabase.from("activity_log").insert({
      contact_id: contactId,
      activity_type: "interaction_logged",
      description: `${channel}: ${notes || "No notes"}. Result: ${outcome}`,
      metadata: { channel, outcome, triggered_by: triggeredByNewsletterId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
