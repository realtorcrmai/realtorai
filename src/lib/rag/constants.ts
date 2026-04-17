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
  TIER3_COMPLEX: 'claude-haiku-4-5-20251001',
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

/** Guardrail patterns — refuse and add disclaimer (25 patterns across 7 categories) */
export const GUARDRAIL_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  // --- Domain safety (tax/legal/financial) — 7 patterns ---
  { pattern: /tax.*(?:strategy|advice|plan|structure|deduct|write.?off|capital.?gain)/i, type: 'tax' },
  { pattern: /legal.*(?:advice|opinion|liability|sue|lawsuit|contract.?review)/i, type: 'legal' },
  { pattern: /(?:guarantee|guaranteed).*(?:return|appreciation|sale|profit|value)/i, type: 'financial' },
  { pattern: /(?:mortgage|loan|qualify).*(?:qualify|approval|rate.*lock|pre-approv)/i, type: 'financial' },
  { pattern: /(?:invest|investment|should.*buy).*(?:advice|recommend|should.*buy|property)/i, type: 'financial' },
  { pattern: /(?:home\s*inspection|inspection\s*report).*(?:interpret|mean|signif)/i, type: 'legal' },
  { pattern: /(?:zoning|bylaw|permit).*(?:advice|can\s*I|allowed|legal)/i, type: 'legal' },
  // --- FINTRAC PII requests — 4 patterns ---
  { pattern: /\b(?:SIN|social\s*insurance\s*number)\b/i, type: 'fintrac_pii' },
  { pattern: /\bpassport\s*number\b/i, type: 'fintrac_pii' },
  { pattern: /\bbank\s*account\s*(?:number|#|detail)/i, type: 'fintrac_pii' },
  { pattern: /\b(?:date\s*of\s*birth|DOB)\b.*(?:show|give|what|tell)/i, type: 'fintrac_pii' },
  // --- Prompt injection — 10 patterns ---
  { pattern: /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i, type: 'injection' },
  { pattern: /disregard\s+(?:all\s+)?(?:previous|prior|above)/i, type: 'injection' },
  { pattern: /you\s+are\s+now\s+(?:a|an|in)\b/i, type: 'injection' },
  { pattern: /(?:reveal|show|print|output|display)\s+(?:your\s+)?system\s*prompt/i, type: 'injection' },
  { pattern: /\bDAN\s+mode\b/i, type: 'injection' },
  { pattern: /\bjailbreak\b/i, type: 'injection' },
  { pattern: /pretend\s+(?:you\s+are|to\s+be)\s+(?:a|an)\b/i, type: 'injection' },
  { pattern: /(?:bypass|override|disable)\s+(?:your\s+)?(?:safety|guardrail|filter|restriction)/i, type: 'injection' },
  { pattern: /(?:act|behave)\s+as\s+(?:if|though)\s+you\s+(?:have|are|were)/i, type: 'injection' },
  { pattern: /(?:forget|clear)\s+(?:all\s+)?(?:your|previous)\s+(?:instructions|rules|context)/i, type: 'injection' },
  // --- Cross-tenant & data exfiltration — 8 patterns ---
  { pattern: /(?:list|show|dump|export)\s+all\s+(?:contacts|clients|sellers|buyers|listings)\b/i, type: 'data_exfil' },
  { pattern: /(?:all|every)\s+(?:realtor|tenant|user|agent)\b.*(?:data|record|info)/i, type: 'data_exfil' },
  { pattern: /(?:other|another)\s+(?:realtor|agent|tenant).*(?:contacts|listings|data)/i, type: 'cross_tenant' },
  { pattern: /(?:how\s+many|total)\s+(?:realtors|agents|tenants|users)\b/i, type: 'cross_tenant' },
  { pattern: /(?:who\s+else|which\s+(?:realtor|agent)).*(?:using|has|listed|sold)/i, type: 'cross_tenant' },
  { pattern: /(?:compare|benchmark).*(?:my|mine).*(?:other|another)\s+(?:realtor|agent)/i, type: 'cross_tenant' },
  { pattern: /(?:competitor|rival|competing)\s+(?:realtor|agent).*(?:listing|client|contact)/i, type: 'cross_tenant' },
  { pattern: /(?:switch|access|view)\s+(?:to|as)\s+(?:another|different)\s+(?:realtor|account|tenant)/i, type: 'cross_tenant' },
];

/** Disclaimer text by guardrail type */
export const DISCLAIMERS: Record<string, string> = {
  tax: "I can't provide tax advice. Please consult a qualified accountant or tax professional.",
  legal: "I can't provide legal advice. Please consult a licensed real estate lawyer.",
  financial: "I can't provide financial or investment advice. Please consult a financial advisor.",
  fintrac_pii: "I can't retrieve or display sensitive identity information. This data is protected under FINTRAC. Please use the secure compliance section.",
  injection: "I'm unable to process that request. If you have a real estate question, I'm happy to help!",
  data_exfil: "I can only show data from your account. I can't access other realtors' data or bulk-export records.",
  cross_tenant: "Each realtor's data is completely isolated. I can only access your contacts, listings, and communications. I cannot view, compare, or reference any other realtor's data.",
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
