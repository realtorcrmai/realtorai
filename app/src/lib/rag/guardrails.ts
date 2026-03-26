// ============================================================
// Guardrails — safety checks + graceful degradation
// ============================================================

import { GUARDRAIL_PATTERNS, DISCLAIMERS } from './constants';

export interface GuardrailResult {
  blocked: boolean;
  type: string | null;
  disclaimer: string | null;
}

/**
 * Check a user message against guardrail patterns.
 * Returns { blocked: true, type, disclaimer } if a pattern matches.
 */
export function checkGuardrails(message: string): GuardrailResult {
  for (const { pattern, type } of GUARDRAIL_PATTERNS) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        type,
        disclaimer: DISCLAIMERS[type] ?? `I can't provide ${type} advice. Please consult a qualified professional.`,
      };
    }
  }
  return { blocked: false, type: null, disclaimer: null };
}

/**
 * Build a graceful fallback response when no relevant context is found.
 */
export function buildFallbackResponse(intent: string): string {
  const tips: Record<string, string[]> = {
    follow_up: [
      'Add notes after calls with contacts',
      'Log showing feedback in the activity timeline',
      'Record meeting outcomes and next steps',
    ],
    newsletter: [
      'Save prior newsletters so I can learn your style',
      'Add past campaigns to build a content library',
      'Upload competitor examples to the knowledge base',
    ],
    social: [
      'Save your Instagram and LinkedIn posts in the CRM',
      'Add past social captions as reference content',
    ],
    qa: [
      'Upload your playbooks and FAQs to the Knowledge Base',
      'Add process documents for listing onboarding, showings, etc.',
      'Create script templates for common client conversations',
    ],
    search: [
      'Add detailed notes to contact records',
      'Log all interactions (calls, emails, showings)',
      'Use tags to categorize contacts and listings',
    ],
    summarize: [
      'Log more interactions in the CRM timeline',
      'Add notes after each call and meeting',
    ],
    competitive: [
      'Subscribe to competitor newsletters via the monitoring inbox',
      'Forward competitor emails to the ingestion webhook',
    ],
  };

  const suggestions = tips[intent] ?? tips.search;

  return [
    "I don't have enough data in your CRM to answer this specifically.",
    "Here's a general response — but it may not reflect your actual data.",
    '',
    'To improve personalization, try:',
    ...suggestions.map((t) => `- ${t}`),
  ].join('\n');
}

/**
 * Check if retrieval results are sufficient quality.
 * Returns true if at least one result has similarity > threshold.
 */
export function hasAdequateContext(
  similarities: number[],
  threshold: number = 0.4
): boolean {
  return similarities.some((s) => s >= threshold);
}
