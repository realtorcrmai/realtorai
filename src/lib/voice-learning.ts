/**
 * Voice Learning Engine — Sprint 4
 *
 * When a realtor edits an AI-drafted email, this module:
 * 1. Compares original draft vs edited version
 * 2. Calls Claude to extract specific writing rules
 * 3. Adds rules to realtor_agent_config.voice_rules
 * 4. Tracks edit rate for trust level promotion
 */

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Extract voice rules from a realtor's edit of an AI-drafted email.
 */
export async function extractVoiceRules(
  realtorId: string,
  originalSubject: string,
  originalBody: string,
  editedSubject: string,
  editedBody: string
): Promise<string[]> {
  // Skip if no actual changes
  if (originalSubject === editedSubject && originalBody === editedBody) {
    return [];
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const { createWithRetry } = await import("@/lib/anthropic/retry");
    const client = new Anthropic();

    // Get existing rules to avoid duplicates
    const supabase = createAdminClient();
    const { data: config } = await supabase
      .from("realtor_agent_config")
      .select("voice_rules")
      .eq("realtor_id", realtorId)
      .single();

    const existingRules = (config?.voice_rules as string[]) || [];

    const response = await createWithRetry(client, {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Compare these two email versions. The ORIGINAL was AI-generated, the EDITED version is what the realtor changed it to. Extract specific, actionable writing rules.

ORIGINAL SUBJECT: ${originalSubject}
EDITED SUBJECT: ${editedSubject}

ORIGINAL BODY (first 300 chars): ${stripHtml(originalBody).slice(0, 300)}
EDITED BODY (first 300 chars): ${stripHtml(editedBody).slice(0, 300)}

EXISTING RULES (don't repeat these):
${existingRules.map((r) => `- ${r}`).join("\n") || "None yet"}

Return ONLY a JSON array of new rule strings. Each rule should be a clear, specific instruction like "Never use exclamation marks in subject lines" or "Say 'worth a look' not 'check this out'". If no meaningful changes were made, return an empty array [].`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const newRules: string[] = JSON.parse(match[0]);
    if (newRules.length === 0) return [];

    // Save new rules
    const allRules = [...existingRules, ...newRules];
    await supabase
      .from("realtor_agent_config")
      .upsert(
        {
          realtor_id: realtorId,
          voice_rules: allRules,
        },
        { onConflict: "realtor_id" }
      );

    // Log the learning
    await supabase.from("agent_learning_log").insert({
      realtor_id: realtorId,
      change_type: "voice_rule",
      field_changed: "voice_rules",
      old_value: existingRules,
      new_value: allRules,
      reason: `Extracted ${newRules.length} rule(s) from realtor edit`,
      auto_applied: true,
      approved: true,
    });

    return newRules;
  } catch (error) {
    console.error("Voice learning error:", error);
    return [];
  }
}

/**
 * Track edit rate for trust level promotion.
 * Returns { totalDrafts, totalEdits, editRate, eligibleForPromotion }
 */
export async function getEditStats(
  realtorId: string,
  days: number = 30
): Promise<{
  totalDrafts: number;
  totalEdits: number;
  editRate: number;
  eligibleForPromotion: boolean;
  currentTrustLevel: number;
}> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Count total drafts that went through approval
  const { count: totalDrafts } = await supabase
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .in("status", ["sent", "draft"])
    .gte("created_at", cutoff);

  // Count edits (feedback with source = realtor_edit or voice rules extracted)
  const { count: totalEdits } = await supabase
    .from("agent_learning_log")
    .select("id", { count: "exact", head: true })
    .eq("realtor_id", realtorId)
    .eq("change_type", "voice_rule")
    .gte("created_at", cutoff);

  const drafts = totalDrafts || 0;
  const edits = totalEdits || 0;
  const editRate = drafts > 0 ? edits / drafts : 0;

  // Trust promotion: if edit rate < 10% over 20+ emails, eligible for next level
  const eligibleForPromotion = drafts >= 20 && editRate < 0.1;

  // Get current trust level (from first journey — simplified)
  const { data: journey } = await supabase
    .from("contact_journeys")
    .select("trust_level")
    .limit(1)
    .single();

  return {
    totalDrafts: drafts,
    totalEdits: edits,
    editRate: Math.round(editRate * 100) / 100,
    eligibleForPromotion,
    currentTrustLevel: journey?.trust_level || 0,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
