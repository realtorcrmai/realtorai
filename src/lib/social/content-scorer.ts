// Magnate Social — Content Quality Scorer
// Uses Claude Haiku for fast, cheap content scoring (0-100)

import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";
import type { SocialBrandKit, ContentScoreBreakdown } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function scoreContent(
  caption: string,
  brandKit: SocialBrandKit
): Promise<ContentScoreBreakdown> {
  if (!caption || caption.length < 10) {
    return { overall: 30, relevance: 3, creativity: 3, cta_clarity: 3, brand_match: 3, engagement_potential: 3, compliance: 3 };
  }

  const model = process.env.SOCIAL_SCORING_MODEL || "claude-haiku-4-5-20251001";

  try {
    const message = await createWithRetry(anthropic, {
      model,
      max_tokens: 300,
      system: "You are a social media content quality evaluator for real estate agents. Score content on 6 dimensions, each 1-10.",
      messages: [{
        role: "user",
        content: `Score this social media caption for a real estate agent:

Caption: "${caption}"

Agent: ${brandKit.agent_name || "Unknown"}, ${brandKit.brokerage_name || ""}
Voice tone target: ${brandKit.voice_tone}
Emoji preference: ${brandKit.emoji_preference}

Score each dimension 1-10:
1. relevance: How relevant to the agent's real estate business?
2. creativity: How unique and engaging vs generic?
3. cta_clarity: Is there a clear call-to-action?
4. brand_match: Does the tone match the agent's voice settings?
5. engagement_potential: Will this drive likes, comments, shares?
6. compliance: Does it include brokerage name? Any misleading claims?

Respond with JSON only:
{"relevance":N,"creativity":N,"cta_clarity":N,"brand_match":N,"engagement_potential":N,"compliance":N}`,
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const scores = JSON.parse(jsonMatch[0]) as Record<string, number>;

    const overall = Math.round(
      ((scores.relevance || 5) +
        (scores.creativity || 5) +
        (scores.cta_clarity || 5) +
        (scores.brand_match || 5) +
        (scores.engagement_potential || 5) +
        (scores.compliance || 5)) /
        6 *
        10
    );

    return {
      relevance: scores.relevance || 5,
      creativity: scores.creativity || 5,
      cta_clarity: scores.cta_clarity || 5,
      brand_match: scores.brand_match || 5,
      engagement_potential: scores.engagement_potential || 5,
      compliance: scores.compliance || 5,
      overall: Math.min(100, Math.max(0, overall)),
    };
  } catch {
    // On failure, return neutral scores
    return { overall: 50, relevance: 5, creativity: 5, cta_clarity: 5, brand_match: 5, engagement_potential: 5, compliance: 5 };
  }
}
