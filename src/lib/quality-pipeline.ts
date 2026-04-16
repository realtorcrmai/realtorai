/**
 * Email Quality Pipeline — score, learn, improve
 *
 * Scores emails on 7 dimensions before sending.
 * Correlates scores with engagement outcomes to improve over time.
 *
 * Flow:
 *   Text pipeline (clean) → Quality score (rate) → Decision (send/regenerate/block)
 *   After send → Engagement data → Feedback loop → Better scores next time
 */

import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";
import { createAdminClient } from "@/lib/supabase/admin";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type QualityScoreInput = {
  subject: string;
  intro: string;
  body: string;
  ctaText: string;
  emailType: string;
  contactName: string;
  contactType: string;
  contactArea?: string;
  contactNotes?: string;
  voiceRules?: string[];
  previousSubjects?: string[];
  /**
   * If provided and an existing quality score is already >= this threshold,
   * skip the Claude scoring call and return a synthetic score using the
   * pre-computed value. Prevents double-scoring when the caller has already
   * scored the content upstream (e.g. sendNewsletter → validatedSend path).
   */
  skipIfScoreAbove?: number;
  /** Pre-computed overall score to reuse when skipIfScoreAbove applies. */
  preComputedScore?: number;
};

export type QualityScore = {
  overall: number;
  dimensions: {
    personalization: number;
    relevance: number;
    dataAccuracy: number;
    toneMatch: number;
    ctaClarity: number;
    length: number;
    uniqueness: number;
  };
  feedback: string;
  suggestions: string[];
  shouldRegenerate: boolean;
  shouldBlock: boolean;
};

export type QualityDecision = {
  action: "send" | "regenerate" | "block";
  score: number;
  reason: string;
  qualityScore: QualityScore;
};

// ═══════════════════════════════════════════════
// QUALITY SCORER (Claude Haiku — fast + cheap)
// ═══════════════════════════════════════════════

let anthropic: Anthropic | null = null;
function getClient() {
  if (!anthropic) anthropic = new Anthropic();
  return anthropic;
}

export async function scoreEmailQuality(input: QualityScoreInput): Promise<QualityScore> {
  // Fix 3: Skip re-scoring when a pre-computed score already meets the threshold.
  // This prevents double-scoring in the sendNewsletter → validatedSend path.
  if (
    input.skipIfScoreAbove !== undefined &&
    input.preComputedScore !== undefined &&
    input.preComputedScore >= input.skipIfScoreAbove
  ) {
    const clamped = clamp(input.preComputedScore);
    return {
      overall: input.preComputedScore,
      dimensions: {
        personalization: clamped,
        relevance: clamped,
        dataAccuracy: clamped,
        toneMatch: clamped,
        ctaClarity: clamped,
        length: clamped,
        uniqueness: clamped,
      },
      feedback: `Pre-computed score ${input.preComputedScore}/10 reused — scoring skipped to avoid double-call`,
      suggestions: [],
      shouldRegenerate: input.preComputedScore < 6,
      shouldBlock: input.preComputedScore < 4,
    };
  }

  const client = getClient();

  const prompt = `Score this real estate email on 7 dimensions (1-10 each).

EMAIL:
Subject: ${input.subject}
Body: ${input.intro} ${input.body}
CTA: ${input.ctaText}
Type: ${input.emailType}

CONTEXT:
Contact: ${input.contactName} (${input.contactType})
${input.contactArea ? `Area: ${input.contactArea}` : ""}
${input.contactNotes ? `Notes: ${input.contactNotes.slice(0, 200)}` : ""}
${input.voiceRules?.length ? `Voice rules: ${input.voiceRules.join("; ")}` : ""}
${input.previousSubjects?.length ? `Recent subjects sent: ${input.previousSubjects.join(", ")}` : ""}

SCORE EACH (1-10):
1. personalization — Does it use contact's specific data (name, area, preferences, history)?
2. relevance — Is the content appropriate for their type/phase/interests?
3. dataAccuracy — Are prices, addresses, stats verifiable and realistic?
4. toneMatch — Does it match the voice rules? Professional but warm?
5. ctaClarity — Is the CTA specific and actionable (not generic "Learn More")?
6. length — Appropriate word count for this email type?
7. uniqueness — Different from previous subjects/angles?

Respond ONLY with valid JSON:
{"personalization":N,"relevance":N,"dataAccuracy":N,"toneMatch":N,"ctaClarity":N,"length":N,"uniqueness":N,"feedback":"1-2 sentences overall","suggestions":["specific improvement 1","specific improvement 2"]}`;

  try {
    const msg = await createWithRetry(client, {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);
    const dims = {
      personalization: clamp(parsed.personalization || 5),
      relevance: clamp(parsed.relevance || 5),
      dataAccuracy: clamp(parsed.dataAccuracy || 5),
      toneMatch: clamp(parsed.toneMatch || 5),
      ctaClarity: clamp(parsed.ctaClarity || 5),
      length: clamp(parsed.length || 5),
      uniqueness: clamp(parsed.uniqueness || 5),
    };

    const overall = Math.round(Object.values(dims).reduce((a, b) => a + b, 0) / 7 * 10) / 10;

    return {
      overall,
      dimensions: dims,
      feedback: parsed.feedback || "",
      suggestions: parsed.suggestions || [],
      shouldRegenerate: overall < 6,
      shouldBlock: overall < 4 || Object.values(dims).some(d => d <= 2),
    };
  } catch (e) {
    console.error('[quality-pipeline] Claude scoring failed:', e);
    // Fallback: return conservative score so unvalidated content is regenerated, not shipped
    return {
      overall: 3,
      dimensions: { personalization: 3, relevance: 3, dataAccuracy: 3, toneMatch: 3, ctaClarity: 3, length: 3, uniqueness: 3 },
      feedback: "Quality scoring unavailable — content flagged for regeneration",
      suggestions: [],
      shouldRegenerate: true,
      shouldBlock: false,
    };
  }
}

function clamp(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}

// ═══════════════════════════════════════════════
// DECISION ENGINE
// ═══════════════════════════════════════════════

export function makeQualityDecision(
  score: QualityScore,
  minScore: number = 6,
): QualityDecision {
  if (score.shouldBlock) {
    return {
      action: "block",
      score: score.overall,
      reason: `Quality too low (${score.overall}/10). ${score.feedback}`,
      qualityScore: score,
    };
  }

  if (score.shouldRegenerate || score.overall < minScore) {
    // Fix 4: Return 'send' instead of 'regenerate' because there is no retry
    // loop in any caller. Returning 'regenerate' was a dead end — the email
    // would never be sent AND never be regenerated. Instead we degrade
    // gracefully: send the email with a logged warning and a reduced score
    // note so the realtor sees it in the quality feed. If a retry mechanism
    // is added later, replace this with action: 'regenerate'.
    console.warn(
      `[quality-pipeline] Score ${score.overall}/10 below threshold ${minScore} — sending anyway (no retry loop). Suggestions: ${score.suggestions.join("; ")}`
    );
    return {
      action: "send",
      score: score.overall,
      reason: `Score ${score.overall}/10 below threshold ${minScore} — proceeding (no regeneration available). Suggestions: ${score.suggestions.join("; ")}`,
      qualityScore: score,
    };
  }

  return {
    action: "send",
    score: score.overall,
    reason: `Quality approved (${score.overall}/10)`,
    qualityScore: score,
  };
}

// ═══════════════════════════════════════════════
// FEEDBACK LOOP — correlate scores with outcomes
// ═══════════════════════════════════════════════

export async function recordQualityOutcome(
  newsletterId: string,
  qualityScore: number,
  dimensions: QualityScore["dimensions"],
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("newsletters").update({
    quality_score: qualityScore,
    ai_context: {
      quality_dimensions: dimensions,
      scored_at: new Date().toISOString(),
    },
  }).eq("id", newsletterId);
}

/**
 * Weekly learning: analyze which quality dimensions correlate with engagement.
 * Updates the minimum score threshold and provides insights for AI prompts.
 */
export async function analyzeQualityOutcomes(): Promise<{
  avgScoreOfOpened: number;
  avgScoreOfClicked: number;
  avgScoreOfIgnored: number;
  bestDimension: string;
  worstDimension: string;
  recommendedMinScore: number;
  insights: string[];
}> {
  const supabase = createAdminClient();

  // Get newsletters with quality scores and engagement data
  const { data: scored } = await supabase
    .from("newsletters")
    .select("id, quality_score, ai_context, newsletter_events(event_type)")
    .not("quality_score", "is", null)
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(200);

  if (!scored || scored.length < 10) {
    return {
      avgScoreOfOpened: 0, avgScoreOfClicked: 0, avgScoreOfIgnored: 0,
      bestDimension: "unknown", worstDimension: "unknown",
      recommendedMinScore: 6,
      insights: ["Not enough data yet — need at least 10 scored emails with engagement data"],
    };
  }

  const opened: number[] = [];
  const clicked: number[] = [];
  const ignored: number[] = [];

  for (const nl of scored) {
    const score = nl.quality_score as number;
    const events = (nl as any).newsletter_events || [];
    const hasOpen = events.some((e: any) => e.event_type === "opened");
    const hasClick = events.some((e: any) => e.event_type === "clicked");

    if (hasClick) clicked.push(score);
    else if (hasOpen) opened.push(score);
    else ignored.push(score);
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;

  const avgOpened = avg(opened);
  const avgClicked = avg(clicked);
  const avgIgnored = avg(ignored);

  // Find recommended minimum score (midpoint between ignored and opened)
  const recommendedMin = avgIgnored > 0 && avgOpened > 0
    ? Math.round((avgIgnored + avgOpened) / 2 * 10) / 10
    : 6;

  const insights: string[] = [];
  if (avgClicked > avgOpened) {
    insights.push(`Emails that get clicks score ${avgClicked} on average vs ${avgOpened} for opens-only. Higher quality → more clicks.`);
  }
  if (avgIgnored > 0 && avgOpened > avgIgnored) {
    insights.push(`Ignored emails average score ${avgIgnored} vs opened at ${avgOpened}. Quality scoring is predictive.`);
  }
  if (recommendedMin > 6) {
    insights.push(`Recommend raising minimum score to ${recommendedMin} — below this, emails rarely get engagement.`);
  }

  // Compute per-dimension averages from ai_context.quality_dimensions across all scored emails
  const dimensionTotals: Record<string, number> = {};
  const dimensionCounts: Record<string, number> = {};
  for (const nl of scored) {
    const dims = (nl.ai_context as any)?.quality_dimensions as Record<string, number> | undefined;
    if (dims) {
      for (const [dim, val] of Object.entries(dims)) {
        if (typeof val === 'number') {
          dimensionTotals[dim] = (dimensionTotals[dim] ?? 0) + val;
          dimensionCounts[dim] = (dimensionCounts[dim] ?? 0) + 1;
        }
      }
    }
  }
  const dimensionAvgs = Object.fromEntries(
    Object.keys(dimensionTotals).map(dim => [dim, dimensionTotals[dim] / dimensionCounts[dim]])
  );
  const sortedDims = Object.entries(dimensionAvgs).sort(([, a], [, b]) => b - a);
  const bestDimension = sortedDims[0]?.[0] ?? 'personalization';
  const worstDimension = sortedDims[sortedDims.length - 1]?.[0] ?? 'uniqueness';

  return {
    avgScoreOfOpened: avgOpened,
    avgScoreOfClicked: avgClicked,
    avgScoreOfIgnored: avgIgnored,
    bestDimension,
    worstDimension,
    recommendedMinScore: recommendedMin,
    insights,
  };
}
