/**
 * Quality Scorer — Sprint 0
 *
 * Uses Claude Haiku to score email quality on 7 dimensions.
 * Cost: ~$0.0005 per email. Catches bad AI output before sending.
 *
 * Dimensions: Personalization, Relevance, Tone, Value, CTA clarity, Length, Uniqueness
 * Score 1-10 each. Avg < 7: regenerate. Avg < 5: skip. Any < 4: skip + alert.
 */

export type QualityScore = {
  personalization: number;
  relevance: number;
  tone: number;
  value: number;
  cta_clarity: number;
  length: number;
  uniqueness: number;
  average: number;
  issues: string[];
  pass: boolean;
  action: "send" | "regenerate" | "skip";
};

type QualityScorerInput = {
  contactName: string;
  contactType: string;
  journeyPhase: string;
  preferredAreas: string[];
  subject: string;
  bodyText: string; // plain text version
  emailType: string;
  voiceRules: string[];
  lastSubjects: string[];
};

/**
 * Score email quality using Claude Haiku.
 * Returns scores + action recommendation.
 */
export async function scoreEmailQuality(
  input: QualityScorerInput
): Promise<QualityScore> {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const { createWithRetry } = await import("@/lib/anthropic/retry");
    const client = new Anthropic();

    const prompt = `Rate this email on 7 dimensions (1-10 each). Return ONLY valid JSON.

EMAIL:
Subject: ${input.subject}
Body: ${input.bodyText.slice(0, 500)}

CONTEXT:
To: ${input.contactName} (${input.contactType}, ${input.journeyPhase} phase)
Areas of interest: ${input.preferredAreas.join(", ") || "not specified"}
Email type: ${input.emailType}
Voice rules: ${input.voiceRules.slice(0, 5).join("; ") || "none set"}
Recent subjects sent: ${input.lastSubjects.slice(0, 3).join(", ") || "none"}

DIMENSIONS:
1. Personalization (1-10): Does it use the contact's specific data? Not generic?
2. Relevance (1-10): Appropriate for their journey phase and interests?
3. Tone (1-10): Matches voice rules? Professional but warm?
4. Value (1-10): Would the recipient find this useful or interesting?
5. CTA clarity (1-10): Is the next action obvious and compelling?
6. Length (1-10): Appropriate length for the email type? Not too long/short?
7. Uniqueness (1-10): Different from recent emails? Not repetitive?

Return JSON: {"personalization":N,"relevance":N,"tone":N,"value":N,"cta_clarity":N,"length":N,"uniqueness":N,"issues":["issue1"]}`;

    const response = await createWithRetry(client, {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackScore("Could not parse quality scorer response");
    }

    const scores = JSON.parse(jsonMatch[0]);
    const dims = [
      scores.personalization || 5,
      scores.relevance || 5,
      scores.tone || 5,
      scores.value || 5,
      scores.cta_clarity || 5,
      scores.length || 5,
      scores.uniqueness || 5,
    ];

    const average = dims.reduce((a: number, b: number) => a + b, 0) / dims.length;
    const minScore = Math.min(...dims);
    const issues: string[] = scores.issues || [];

    let action: "send" | "regenerate" | "skip" = "send";
    if (average < 5 || minScore < 4) {
      action = "skip";
      issues.push(
        `Quality too low: avg=${average.toFixed(1)}, min=${minScore}`
      );
    } else if (average < 7) {
      action = "regenerate";
      issues.push(
        `Quality below threshold: avg=${average.toFixed(1)}, consider regenerating`
      );
    }

    return {
      personalization: scores.personalization || 5,
      relevance: scores.relevance || 5,
      tone: scores.tone || 5,
      value: scores.value || 5,
      cta_clarity: scores.cta_clarity || 5,
      length: scores.length || 5,
      uniqueness: scores.uniqueness || 5,
      average: Math.round(average * 10) / 10,
      issues,
      pass: action !== "skip",
      action,
    };
  } catch (error) {
    // If scorer fails, don't block the email — return a passing score with warning
    return fallbackScore(
      `Quality scorer error: ${error instanceof Error ? error.message : "unknown"}`
    );
  }
}

function fallbackScore(warning: string): QualityScore {
  return {
    personalization: 7,
    relevance: 7,
    tone: 7,
    value: 7,
    cta_clarity: 7,
    length: 7,
    uniqueness: 7,
    average: 7,
    issues: [warning],
    pass: true,
    action: "send",
  };
}
