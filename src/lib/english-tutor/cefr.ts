import type { CEFRLevel, SessionScores } from "./types";

/**
 * Map an average score (0-100) to a CEFR level.
 */
export function scoreToCEFR(averageScore: number): CEFRLevel {
  if (averageScore >= 86) return "C2";
  if (averageScore >= 71) return "C1";
  if (averageScore >= 56) return "B2";
  if (averageScore >= 41) return "B1";
  if (averageScore >= 21) return "A2";
  return "A1";
}

/**
 * Calculate the average score from individual dimension scores.
 */
export function averageScore(scores: SessionScores): number {
  const { fluency, grammar, vocabulary, pronunciation } = scores;
  return (fluency + grammar + vocabulary + pronunciation) / 4;
}

/**
 * CEFR levels ordered for comparison.
 */
const CEFR_ORDER: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function cefrToNumber(level: CEFRLevel): number {
  return CEFR_ORDER.indexOf(level);
}

export function compareCEFR(a: CEFRLevel, b: CEFRLevel): number {
  return cefrToNumber(a) - cefrToNumber(b);
}
