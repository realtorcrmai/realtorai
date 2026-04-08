import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentType } from './types.js';

/**
 * RAG retriever — STUB.
 *
 * M3-D: the agent-scoring cron port calls `retrieveContext()` to augment
 * Claude's lead-scoring prompt with full interaction history beyond the
 * 30-day SQL window. The CRM original wraps the call in try/catch and
 * gracefully degrades to "no RAG context" on failure.
 *
 * The full retriever (HyDE expansion + hybrid semantic/FTS search via the
 * `rag_search` Postgres function + chunk formatting + source extraction)
 * is non-trivial to port — it pulls in `embedQuery`, `hybridSearch`,
 * `formatContextChunks`, `extractSourceRefs`, the `RETRIEVAL` constants,
 * and a `fullTextSearch` fallback. That work is deferred to M4 so M3-D
 * can ship one cron at a time, per the M3-A→M3-E sequence in the master
 * plan §6.6.
 *
 * This stub returns an empty result, which is behaviourally identical to
 * the CRM original's "RAG unavailable, fall through" branch. The lead
 * scorer's prompt simply omits the RAG block when `formatted` is empty.
 *
 * When M4 ports the real retriever, replace this entire file — the public
 * shape of `retrieveContext` is locked down by the lead scorer's call site
 * and is intentionally narrow (`{ formatted, sources, results }` with
 * empty defaults) so a real implementation is a drop-in.
 */

export interface SourceReference {
  source_table: string;
  source_id: string;
  similarity?: number;
}

export interface SearchResult {
  source_table: string;
  source_id: string;
  content_text: string;
  similarity: number;
}

export interface SearchFilters {
  contact_id?: string;
  listing_id?: string;
  content_type?: ContentType[];
  date_after?: string;
}

export interface RetrieveContextResult {
  formatted: string;
  sources: SourceReference[];
  results: SearchResult[];
}

/**
 * Stub: returns empty context. The lead scorer treats an empty `formatted`
 * string the same way the CRM treats a thrown error from `retrieveContext`
 * — it skips the RAG augmentation block and runs with the 30-day SQL
 * context only.
 *
 * Parameters are kept in the signature so the M4 full-port is a drop-in
 * replacement. They are intentionally unused here.
 */
export async function retrieveContext(
  _db: SupabaseClient,
  _query: string,
  _filters: SearchFilters = {},
  _topK: number = 5
): Promise<RetrieveContextResult> {
  return {
    formatted: '',
    sources: [],
    results: [],
  };
}
