"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWithRetry } from "@/lib/anthropic/retry";
import { z } from "zod";

const anthropic = new Anthropic();

const SendDecisionSchema = z.object({
  decision: z.enum(["send", "skip", "swap"]),
  swap_to: z.string().optional(),
  reasoning: z.string(),
  urgency: z.enum(["high", "medium", "low"]).optional(),
});

export type SendDecision = z.infer<typeof SendDecisionSchema>;

/**
 * Consult the AI advisor before sending a workflow email step.
 * Returns send/skip/swap decision with reasoning.
 */
export async function adviseSend(
  contactId: string,
  scheduledEmailType: string,
  journeyPhase: string,
): Promise<SendDecision> {
  // Feature flag check
  if (process.env.AI_SEND_ADVISOR !== "true") {
    return { decision: "send", reasoning: "AI advisor disabled (AI_SEND_ADVISOR != true)" };
  }

  const supabase = createAdminClient();

  // Fetch contact + recent data
  const { data: contact } = await supabase
    .from("contacts")
    .select("name, type, stage_bar, lead_status, newsletter_intelligence, ai_lead_score, buyer_preferences")
    .eq("id", contactId)
    .single();

  if (!contact) {
    return { decision: "send", reasoning: "Contact not found, proceeding with send" };
  }

  // Recent newsletter events (last 14 days)
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data: recentEvents } = await supabase
    .from("newsletter_events")
    .select("event_type, link_type, created_at")
    .eq("contact_id", contactId)
    .gte("created_at", twoWeeksAgo)
    .order("created_at", { ascending: false })
    .limit(15);

  // Recent newsletters sent
  const { data: recentSent } = await supabase
    .from("newsletters")
    .select("email_type, sent_at, status")
    .eq("contact_id", contactId)
    .in("status", ["sent", "draft", "approved"])
    .order("created_at", { ascending: false })
    .limit(5);

  // Active listings for potential swap
  const { data: activeListings } = await supabase
    .from("listings")
    .select("address, list_price, status")
    .eq("status", "active")
    .limit(5);

  const intel = (contact.newsletter_intelligence as Record<string, any>) || {};
  const aiScore = (contact.ai_lead_score as Record<string, any>) || {};

  const prompt = `You are an email marketing advisor for a BC real estate CRM.

SCHEDULED EMAIL: "${scheduledEmailType}" (journey phase: ${journeyPhase})

CONTACT: ${contact.name} (${contact.type}, stage: ${contact.stage_bar || "new"})
- Engagement score: ${intel.engagement_score || 0}/100
- Content preference: ${intel.content_preference || "unknown"}
- AI intent: ${aiScore.intent || "unknown"}
- Buying readiness: ${aiScore.buying_readiness || "unscored"}/100

RECENT ENGAGEMENT (last 14 days):
- Opens: ${recentEvents?.filter(e => e.event_type === "opened").length || 0}
- Clicks: ${recentEvents?.filter(e => e.event_type === "clicked").length || 0}
- Click types: ${recentEvents?.filter(e => e.event_type === "clicked").map(e => e.link_type).filter(Boolean).join(", ") || "none"}

RECENT EMAILS SENT:
${recentSent?.map(n => `- ${n.email_type} (${n.status}, ${n.sent_at || "not sent"})`).join("\n") || "none"}

ACTIVE LISTINGS AVAILABLE:
${activeListings?.map(l => `- ${l.address}: $${l.list_price?.toLocaleString()}`).join("\n") || "none"}

Should we SEND this "${scheduledEmailType}" email, SKIP it (not relevant right now), or SWAP it for a different type that would be more effective?

Available email types to swap to: new_listing_alert, market_update, neighbourhood_guide, home_anniversary, reengagement, referral_ask

Respond with JSON only:
{ "decision": "send|skip|swap", "swap_to": "email_type (if swap)", "reasoning": "Brief explanation", "urgency": "high|medium|low" }`;

  // RAG: retrieve full engagement pattern history
  let ragContext = '';
  try {
    const { retrieveContext } = await import('@/lib/rag/retriever');
    const retrieved = await retrieveContext(
      `${contact.name} email engagement open click history`,
      { contact_id: contact.id, content_type: ['email', 'activity'] },
      5
    );
    if (retrieved.formatted) ragContext = `\n\nFULL ENGAGEMENT HISTORY:\n${retrieved.formatted}`;
  } catch { /* RAG not available */ }

  try {
    const model = process.env.AI_SCORING_MODEL || "claude-sonnet-4-20250514";
    const message = await createWithRetry(anthropic, {
      model,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt + ragContext }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return SendDecisionSchema.parse(parsed);
    }
  } catch (e) {
    console.error("Send advisor error:", e);
  }

  // Default: proceed with send
  return { decision: "send", reasoning: "Advisor failed, defaulting to send" };
}
