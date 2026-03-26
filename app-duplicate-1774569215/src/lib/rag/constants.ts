// ============================================================
// RAG System Constants
// ============================================================

import type { ContentType, QueryIntent } from './types';

/** Voyage embedding model */
export const EMBEDDING_MODEL = 'voyage-3-large';

/** Embedding dimensions (Voyage-3-large) */
export const EMBEDDING_DIMS = 1024;

/** Claude models for each tier */
export const MODELS = {
  TIER1_PLANNER: 'claude-haiku-4-5-20251001',
  TIER3_STANDARD: 'claude-sonnet-4-20250514',
  TIER3_COMPLEX: 'claude-opus-4-6',
} as const;

/** Max tokens per tier */
export const MAX_TOKENS = {
  TIER1_PLANNER: 300,
  TIER3_STANDARD: 2000,
  TIER3_COMPLEX: 4000,
} as const;

/** Default retrieval settings */
export const RETRIEVAL = {
  DEFAULT_TOP_K: 5,
  MAX_TOP_K: 20,
  SIMILARITY_THRESHOLD: 0.3,
  MAX_CONTEXT_TOKENS: 4000,
} as const;

/** Chunking config per source type */
export const CHUNK_CONFIG: Record<string, { maxTokens: number; overlap: number }> = {
  communications: { maxTokens: 512, overlap: 0 },
  activities: { maxTokens: 512, overlap: 0 },
  newsletters: { maxTokens: 1024, overlap: 128 },
  contacts: { maxTokens: 1024, overlap: 0 },
  listings: { maxTokens: 1024, overlap: 0 },
  agent_recommendations: { maxTokens: 512, overlap: 0 },
  message_templates: { maxTokens: 512, overlap: 0 },
  offers: { maxTokens: 512, overlap: 0 },
  offer_conditions: { maxTokens: 512, overlap: 0 },
  knowledge_articles: { maxTokens: 1024, overlap: 128 },
  competitive_emails: { maxTokens: 1024, overlap: 128 },
};

/** Preset top_k by intent */
export const TOP_K_BY_INTENT: Record<QueryIntent, number> = {
  follow_up: 5,
  newsletter: 10,
  social: 8,
  qa: 5,
  search: 10,
  summarize: 15,
  competitive: 10,
  greeting: 0,
  clarification: 0,
};

/** Content type filters by intent */
export const CONTENT_TYPES_BY_INTENT: Record<QueryIntent, ContentType[] | null> = {
  follow_up: ['message', 'activity'],
  newsletter: ['email', 'template', 'competitor'],
  social: ['email', 'social_post'],
  qa: ['faq', 'playbook', 'script', 'process', 'explainer'],
  search: null, // all types
  summarize: ['message', 'activity', 'email'],
  competitive: ['competitor'],
  greeting: null,
  clarification: null,
};

/** Guardrail patterns — refuse and add disclaimer */
export const GUARDRAIL_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /tax.*(?:strategy|advice|plan|structure|deduct)/i, type: 'tax' },
  { pattern: /legal.*(?:advice|opinion|liability|sue|lawsuit)/i, type: 'legal' },
  { pattern: /(?:guarantee|guaranteed).*(?:return|appreciation|sale|profit)/i, type: 'financial' },
  { pattern: /(?:mortgage|loan|qualify).*(?:qualify|approval|rate.*lock|pre-approv|mortgage)/i, type: 'financial' },
  { pattern: /(?:invest|investment|should.*buy).*(?:advice|recommend|should.*buy|invest|property)/i, type: 'financial' },
];

/** Disclaimer text by guardrail type */
export const DISCLAIMERS: Record<string, string> = {
  tax: "I can't provide tax advice. Please consult a qualified accountant or tax professional.",
  legal: "I can't provide legal advice. Please consult a licensed real estate lawyer.",
  financial: "I can't provide financial or investment advice. Please consult a financial advisor.",
};

/** Session config */
export const SESSION = {
  /** Max turns to include in Tier 3 prompt */
  MAX_HISTORY_TURNS: 6,
  /** Session idle timeout (ms) — 30 minutes */
  IDLE_TIMEOUT_MS: 30 * 60 * 1000,
  /** Max messages before summarization */
  SUMMARIZE_THRESHOLD: 10,
} as const;

/** Approximate token count from character count (rough: 1 token ≈ 4 chars) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
