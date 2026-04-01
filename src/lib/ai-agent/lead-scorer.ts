"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWithRetry } from "@/lib/anthropic/retry";
import { z } from "zod";

const anthropic = new Anthropic();

const LeadScoreSchema = z.object({
  buying_readiness: z.number().min(0).max(100),
  timeline_urgency: z.number().min(0).max(100),
  budget_fit: z.number().min(0).max(100),
  intent: z.enum(["serious_buyer", "active_searcher", "window_shopping", "investor", "dormant", "ready_to_sell", "considering_selling", "not_ready"]),
  reasoning: z.string(),
  stage_recommendation: z.enum(["advance", "maintain", "downgrade"]).optional(),
  new_stage: z.string().optional(),
  personalization_hints: z.object({
    tone: z.string().optional(),
    interests: z.array(z.string()).optional(),
    price_anchor: z.string().optional(),
    hot_topic: z.string().optional(),
    avoid: z.string().optional(),
    relationship_stage: z.string().optional(),
    note: z.string().optional(),
  }).optional(),
});

type LeadScore = z.infer<typeof LeadScoreSchema>;

export async function scoreContact(contactId: string): Promise<LeadScore | null> {
  const supabase = createAdminClient();

  // Fetch contact with all relevant data
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name, type, email, stage_bar, lead_status, tags, buyer_preferences, seller_preferences, newsletter_intelligence, family_members, created_at")
    .eq("id", contactId)
    .single();

  if (!contact) return null;

  // Fetch recent activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { data: communications },
    { data: newsletterEvents },
    { data: activities },
    { data: showings },
  ] = await Promise.all([
    supabase.from("communications").select("channel, direction, body, created_at")
      .eq("contact_id", contactId).gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }).limit(20),
    supabase.from("newsletter_events").select("event_type, link_type, link_url, created_at")
      .eq("contact_id", contactId).gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }).limit(30),
    supabase.from("activity_log").select("activity_type, description, created_at")
      .eq("contact_id", contactId).gte("created_at", thirtyDaysAgo).order("created_at", { ascending: false }).limit(20),
    supabase.from("appointments").select("status, start_time")
      .eq("contact_id", contactId).gte("created_at", thirtyDaysAgo),
  ]);

  // Build context summary
  const intel = (contact.newsletter_intelligence as Record<string, any>) || {};
  const context = buildScoringContext(contact, communications || [], newsletterEvents || [], activities || [], showings || [], intel);

  // RAG augmentation: retrieve full interaction history beyond 30-day window
  let ragContext = '';
  try {
    const { retrieveContext } = await import('@/lib/rag/retriever');
    const db = createAdminClient();
    const retrieved = await retrieveContext(
      db,
      `${contact.name} engagement history preferences intent`,
      {
        contact_id: contactId,
        content_type: ['message', 'activity', 'email', 'recommendation'],
      },
      5
    );
    if (retrieved.formatted) {
      ragContext = `\n\nADDITIONAL CONTEXT FROM FULL HISTORY:\n${retrieved.formatted}`;
    }
  } catch {
    // RAG not available — continue with standard 30-day window
  }

  const model = process.env.AI_SCORING_MODEL || "claude-sonnet-4-20250514";

  try {
    const message = await createWithRetry(anthropic, {
      model,
      max_tokens: 800,
      system: SCORING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: context + ragContext }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    else {
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) jsonStr = braceMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    return LeadScoreSchema.parse(parsed);
  } catch (e) {
    console.error(`Lead scoring failed for contact ${contactId}:`, e);
    return null;
  }
}

export async function scoreBatch(contactIds: string[]): Promise<{ scored: number; errors: number }> {
  let scored = 0;
  let errors = 0;
  const supabase = createAdminClient();

  for (const contactId of contactIds.slice(0, 50)) {
    try {
      const score = await scoreContact(contactId);
      if (score) {
        await supabase.from("contacts").update({
          ai_lead_score: {
            ...score,
            scored_at: new Date().toISOString(),
          },
        }).eq("id", contactId);

        // Write stage recommendation if present
        if (score.stage_recommendation === "advance" && score.new_stage) {
          await supabase.from("agent_recommendations").insert({
            contact_id: contactId,
            action_type: "advance_stage",
            action_config: { new_stage: score.new_stage },
            reasoning: score.reasoning,
            priority: score.buying_readiness > 70 ? "hot" : "warm",
          });
        }

        scored++;
      } else {
        errors++;
      }
    } catch (e) {
      console.error(`Batch scoring error for ${contactId}:`, e);
      errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  return { scored, errors };
}

function buildScoringContext(
  contact: any,
  communications: any[],
  newsletterEvents: any[],
  activities: any[],
  showings: any[],
  intel: Record<string, any>,
): string {
  const prefs = contact.buyer_preferences || contact.seller_preferences || {};
  const openCount = newsletterEvents.filter(e => e.event_type === "opened").length;
  const clickCount = newsletterEvents.filter(e => e.event_type === "clicked").length;
  const clickTypes = newsletterEvents.filter(e => e.event_type === "clicked").map(e => e.link_type).filter(Boolean);
  const showingCount = showings?.length || 0;
  const confirmedShowings = showings?.filter(s => s.status === "confirmed").length || 0;

  return `Score this real estate contact:

NAME: ${contact.name}
TYPE: ${contact.type}
STAGE: ${contact.stage_bar || "new"}
LEAD STATUS: ${contact.lead_status || "new"}
TAGS: ${JSON.stringify(contact.tags || [])}
CREATED: ${contact.created_at}

PREFERENCES:
${JSON.stringify(prefs, null, 2)}

LAST 30 DAYS ACTIVITY:
- Emails opened: ${openCount}
- Links clicked: ${clickCount}
- Click types: ${clickTypes.join(", ") || "none"}
- Showings: ${showingCount} total, ${confirmedShowings} confirmed
- Communications: ${communications.length} messages
- Engagement score: ${intel.engagement_score || 0}/100
- Content preference: ${intel.content_preference || "unknown"}
- Inferred interests: ${JSON.stringify(intel.inferred_interests || {})}

RECENT CLICKS (last 5):
${(intel.click_history || []).slice(-5).map((c: any) => `- ${c.link_type}: ${c.clicked_at}`).join("\n") || "none"}

RECENT COMMUNICATIONS (last 5):
${communications.slice(0, 5).map(c => `- ${c.direction} ${c.channel}: "${c.body?.slice(0, 80)}..." (${c.created_at})`).join("\n") || "none"}`;
}

const SCORING_SYSTEM_PROMPT = `You are a real estate lead scoring AI for a BC REALTOR CRM.

Analyze the contact's behavioral data and output a JSON lead score. Be specific in your reasoning — cite actual data points (click counts, showing history, engagement patterns).

Rules:
- buying_readiness: 0-100, based on behavioral signals (clicks, showings, engagement)
- timeline_urgency: 0-100, based on click clustering, recency, stated timeline
- budget_fit: 0-100, based on properties viewed vs stated preferences
- intent: categorize their behavior pattern
- stage_recommendation: "advance" if behavioral signals suggest they've moved past their current stage, "maintain" if appropriate, "downgrade" if going dormant
- personalization_hints: tone, interests, hot topics for the newsletter AI

Respond with ONLY valid JSON matching this structure:
{
  "buying_readiness": 75,
  "timeline_urgency": 60,
  "budget_fit": 80,
  "intent": "serious_buyer",
  "reasoning": "Specific reasoning citing data...",
  "stage_recommendation": "advance",
  "new_stage": "qualified",
  "personalization_hints": {
    "tone": "data-driven",
    "interests": ["Kitsilano", "condos"],
    "price_anchor": "$850K",
    "hot_topic": "new listings",
    "avoid": "generic market updates",
    "relationship_stage": "warm",
    "note": "Has school-age children based on school_info clicks"
  }
}`;
