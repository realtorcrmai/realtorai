"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWithRetry } from "@/lib/anthropic/retry";
import { z } from "zod";

const anthropic = new Anthropic();

const RecommendationSchema = z.object({
  contact_id: z.string(),
  action_type: z.enum(["call", "send_email", "send_sms", "send_greeting", "enroll_workflow", "advance_stage", "add_tag", "create_task", "reengage"]),
  reasoning: z.string(),
  priority: z.enum(["hot", "warm", "info"]),
  action_config: z.record(z.string(), z.unknown()).optional(),
});

type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Generate 3-5 actionable recommendations for the realtor's dashboard.
 * Reads top contacts by AI lead score and recent activity.
 */
export async function generateRecommendations(): Promise<Recommendation[]> {
  const supabase = createAdminClient();

  // Fetch top scored contacts
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, type, stage_bar, lead_status, email, phone, ai_lead_score, newsletter_intelligence")
    .not("ai_lead_score", "is", null)
    .eq("newsletter_unsubscribed", false)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (!contacts?.length) return [];

  // Sort by buying_readiness from ai_lead_score
  const scored = contacts
    .filter(c => (c.ai_lead_score as any)?.buying_readiness != null)
    .sort((a, b) => ((b.ai_lead_score as any)?.buying_readiness || 0) - ((a.ai_lead_score as any)?.buying_readiness || 0))
    .slice(0, 10);

  if (!scored.length) return [];

  // Build context for Claude
  const contactSummaries = scored.map(c => {
    const score = (c.ai_lead_score as Record<string, any>) || {};
    const intel = (c.newsletter_intelligence as Record<string, any>) || {};
    return `- ${c.name} (${c.type}, stage: ${c.stage_bar || "new"}, status: ${c.lead_status || "new"})
  Readiness: ${score.buying_readiness}/100, Intent: ${score.intent}, Urgency: ${score.timeline_urgency}/100
  Engagement: ${intel.engagement_score || 0}/100, Last click: ${intel.last_clicked || "never"}
  Stage rec: ${score.stage_recommendation || "none"} → ${score.new_stage || "N/A"}
  AI reasoning: ${(score.reasoning || "").slice(0, 120)}`;
  }).join("\n\n");

  const prompt = `You are a real estate CRM AI advisor. Based on these contacts' lead scores and engagement data, generate 3-5 actionable recommendations for the realtor.

CONTACTS:
${contactSummaries}

For each recommendation, specify:
1. Which contact (use their exact id from the data)
2. What action to take (call, send_email, advance_stage, reengage, create_task)
3. Why (specific reasoning citing their data)
4. Priority: hot (act today), warm (this week), info (nice to know)

Respond with a JSON array:
[
  {
    "contact_id": "exact-uuid",
    "action_type": "call",
    "reasoning": "Specific reason...",
    "priority": "hot"
  }
]

Only recommend actions where the data clearly supports it. Don't recommend calling everyone.`;

  // RAG: retrieve outcomes from past recommendations
  let ragContext = '';
  try {
    const { retrieveContext } = await import('@/lib/rag/retriever');
    const retrieved = await retrieveContext(
      'successful recommendations outcomes accepted actions',
      { content_type: ['recommendation', 'activity'] },
      5
    );
    if (retrieved.formatted) ragContext = `\n\nPAST RECOMMENDATION OUTCOMES:\n${retrieved.formatted}`;
  } catch { /* RAG not available */ }

  try {
    const model = process.env.AI_SCORING_MODEL || "claude-sonnet-4-20250514";
    const message = await createWithRetry(anthropic, {
      model,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt + ragContext }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON array
    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    else {
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) jsonStr = arrayMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const validated = z.array(RecommendationSchema).parse(parsed);

    // Verify contact_ids are valid
    const validIds = new Set(scored.map(c => c.id));
    return validated.filter(r => validIds.has(r.contact_id));
  } catch (e) {
    console.error("Next best action generation error:", e);
    return [];
  }
}

/**
 * Save recommendations to database and expire old ones.
 */
export async function saveRecommendations(recs: Recommendation[]): Promise<number> {
  const supabase = createAdminClient();

  // Expire old pending recommendations
  await supabase
    .from("agent_recommendations")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  if (!recs.length) return 0;

  const rows = recs.map(r => ({
    contact_id: r.contact_id,
    action_type: r.action_type,
    action_config: r.action_config || {},
    reasoning: r.reasoning,
    priority: r.priority,
    status: "pending",
    expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
  }));

  const { error } = await supabase.from("agent_recommendations").insert(rows);
  if (error) {
    console.error("Failed to save recommendations:", error);
    return 0;
  }

  return rows.length;
}
