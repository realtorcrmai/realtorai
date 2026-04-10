import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

/**
 * POST /api/feedback — Record feedback on an email
 *
 * Body: {
 *   newsletterId: string,
 *   source: "prospect_reaction" | "realtor_quick" | "realtor_rating" | "deal_survey",
 *   rating: number (1-5 or 1/-1 for thumbs up/down),
 *   note?: string,
 *   metadata?: object
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { newsletterId, source, rating, note, metadata } = body;

    if (!newsletterId || !source) {
      return NextResponse.json({ error: "newsletterId and source required" }, { status: 400 });
    }

    const supabase = await getAuthenticatedTenantClient();

    // Record feedback
    const { error } = await supabase.from("email_feedback").insert({
      newsletter_id: newsletterId,
      feedback_source: source,
      rating: rating || null,
      note: note || null,
      metadata: metadata || {},
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If prospect reaction (thumbs up/down), update engagement score
    if (source === "prospect_reaction") {
      const { data: nl } = await supabase
        .from("newsletters")
        .select("contact_id")
        .eq("id", newsletterId)
        .single();

      if (nl?.contact_id) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("newsletter_intelligence")
          .eq("id", nl.contact_id)
          .single();

        if (contact) {
          const intel = (contact.newsletter_intelligence as Record<string, unknown>) || {};
          const currentScore = (intel.engagement_score as number) || 0;
          const scoreChange = rating === 1 ? 5 : rating === -1 ? -10 : 0;
          const newScore = Math.max(0, Math.min(100, currentScore + scoreChange));

          // Add to reaction history
          const history = (intel.reaction_history as Array<Record<string, unknown>>) || [];
          history.push({
            email_id: newsletterId,
            reaction: rating === 1 ? "thumbs_up" : "thumbs_down",
            timestamp: new Date().toISOString(),
          });

          await supabase
            .from("contacts")
            .update({
              newsletter_intelligence: {
                ...intel,
                engagement_score: newScore,
                reaction_history: history.slice(-20), // keep last 20
              },
            })
            .eq("id", nl.contact_id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
