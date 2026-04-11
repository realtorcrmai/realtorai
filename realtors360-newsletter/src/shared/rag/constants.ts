/**
 * RAG retrieval constants.
 *
 * Ported from `realestate-crm/src/lib/rag/constants.ts` (RETRIEVAL block
 * only). The CRM original also defines MODELS, MAX_TOKENS, GUARDRAIL_PATTERNS,
 * SESSION etc. — those are owned by the chat assistant surface, not the
 * retriever, and are intentionally NOT brought across.
 *
 * Behaviour preservation:
 *   - DEFAULT_TOP_K: 5 (matches CRM and the lead-scorer's existing call)
 *   - MAX_TOP_K: 20 (rag_search RPC enforces this server-side too)
 *   - SIMILARITY_THRESHOLD: 0.3 (Voyage cosine similarity floor)
 *   - MAX_CONTEXT_TOKENS: 4000 (cap on `formatContextChunks` output)
 */

export const RETRIEVAL = {
  DEFAULT_TOP_K: 5,
  MAX_TOP_K: 20,
  SIMILARITY_THRESHOLD: 0.3,
  MAX_CONTEXT_TOKENS: 4000,
} as const;

/**
 * Anthropic model used by the HyDE expander. Haiku because HyDE is a
 * cheap, best-effort generation step — quality matters less than latency.
 * Falls back silently to plain query embedding on failure.
 */
export const HYDE_MODEL = 'claude-haiku-4-5-20251001';
