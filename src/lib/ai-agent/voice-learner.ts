import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";

interface VoiceRule {
  rule_type: string;
  rule_text: string;
  confidence: number;
  source_count: number;
  examples: Array<{ original: string; edited: string }>;
}

export async function extractVoiceRules(limit: number = 20): Promise<VoiceRule[]> {
  const supabase = createAdminClient();

  // Fetch recent edits
  const { data: edits } = await supabase
    .from("edit_history")
    .select("original_subject, edited_subject, original_body_excerpt, edited_body_excerpt, edit_type")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!edits || edits.length < 3) return [];

  const editPairs = edits.map((e, i) =>
    `Edit ${i + 1}:\n  Original subject: "${e.original_subject}"\n  Edited subject: "${e.edited_subject}"\n  Original body: "${e.original_body_excerpt.slice(0, 200)}"\n  Edited body: "${e.edited_body_excerpt.slice(0, 200)}"\n  Edit type: ${e.edit_type}`
  ).join("\n\n");

  const anthropic = new Anthropic();
  const msg = await createWithRetry(anthropic, {
    model: process.env.AI_EVAL_MODEL || "claude-opus-4-6",
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `Analyze these email edits where a realtor revised AI-generated content.

${editPairs}

Identify consistent patterns in:
1. Greeting style (e.g., "Hey" vs "Hello")
2. Sign-off style
3. Tone (formal vs casual vs warm)
4. Vocabulary preferences
5. Structure preferences
6. Subject line patterns
7. Things always added
8. Things always removed

Output a JSON array of rules. Only include rules with 2+ supporting examples.
Confidence: 0.5 for 2 examples, +0.1 per additional example, cap at 0.95.

Format:
[{"rule_type":"tone|greeting|sign_off|vocabulary|structure|subject_line|avoid|always_include","rule_text":"description","confidence":0.5,"source_count":2}]`,
    }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) return [];

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

export async function getActiveVoiceRules(): Promise<VoiceRule[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("voice_rules")
    .select("rule_type, rule_text, confidence, source_count, examples")
    .eq("is_active", true)
    .order("confidence", { ascending: false });

  return (data ?? []) as VoiceRule[];
}

export async function buildVoiceRulesPromptBlock(): Promise<string> {
  const rules = await getActiveVoiceRules();
  if (rules.length === 0) return "";

  const rulesText = rules
    .map((r) => `- [${r.rule_type}] ${r.rule_text} (confidence: ${(r.confidence * 100).toFixed(0)}%)`)
    .join("\n");

  return `\nYOUR VOICE RULES (learned from past edits):\n${rulesText}\nFollow these rules closely — they reflect the realtor's personal style.\n`;
}

export async function syncVoiceRules(): Promise<{ added: number; updated: number }> {
  const supabase = createAdminClient();
  const newRules = await extractVoiceRules();

  let added = 0;
  let updated = 0;

  for (const rule of newRules) {
    // Check if similar rule exists
    const { data: existing } = await supabase
      .from("voice_rules")
      .select("id, confidence, source_count")
      .eq("rule_type", rule.rule_type)
      .ilike("rule_text", `%${rule.rule_text.slice(0, 30)}%`)
      .limit(1)
      .single();

    if (existing) {
      // Update confidence and source count
      await supabase
        .from("voice_rules")
        .update({
          confidence: Math.min(0.95, Math.max(existing.confidence, rule.confidence)),
          source_count: existing.source_count + rule.source_count,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      updated++;
    } else {
      await supabase.from("voice_rules").insert({
        rule_type: rule.rule_type,
        rule_text: rule.rule_text,
        confidence: rule.confidence,
        source_count: rule.source_count,
        examples: rule.examples ?? [],
      });
      added++;
    }
  }

  return { added, updated };
}
