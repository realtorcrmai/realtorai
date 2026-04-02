// ============================================================
// Retriever — hybrid semantic + structured search over rag_embeddings
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { embedQuery } from './embeddings';
import { fullTextSearch } from './fallback';
import { RETRIEVAL } from './constants';
import type { SearchResult, SearchFilters, SourceReference } from './types';

/**
 * Perform semantic search with optional structured filters.
 * Returns top-K results sorted by similarity.
 */
export async function searchEmbeddings(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<SearchResult[]> {

  // 1. Embed the query (asymmetric: input_type='query')
  const queryEmbedding = await embedQuery(query);

  // 2. Call the rag_search function
  const { data, error } = await db.rpc('rag_search', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    filter_types: filters.content_type ?? null,
    filter_contact_id: filters.contact_id ?? null,
    filter_listing_id: filters.listing_id ?? null,
    filter_after: filters.date_after ?? null,
    match_count: Math.min(topK, RETRIEVAL.MAX_TOP_K),
    match_threshold: RETRIEVAL.SIMILARITY_THRESHOLD,
  });

  if (error) {
    console.warn(`RAG semantic search failed, falling back to FTS: ${error.message}`);
    try {
      return await fullTextSearch(db, query, filters, topK) as SearchResult[];
    } catch (ftsError) {
      throw new Error(`RAG search failed (semantic + FTS): ${error.message}`);
    }
  }

  return (data ?? []) as SearchResult[];
}

/**
 * Format search results into numbered context chunks for LLM prompt.
 * Respects MAX_CONTEXT_TOKENS budget.
 */
export function formatContextChunks(results: SearchResult[]): string {
  if (results.length === 0) return '';

  let totalChars = 0;
  const maxChars = RETRIEVAL.MAX_CONTEXT_TOKENS * 4; // rough chars from tokens
  const lines: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const date = r.source_created_at
      ? new Date(r.source_created_at).toISOString().split('T')[0]
      : 'unknown date';
    const line = `[${i + 1}] (${r.source_table}, ${date}, score: ${r.similarity.toFixed(2)}) ${r.content_text}`;

    if (totalChars + line.length > maxChars) break;
    totalChars += line.length;
    lines.push(line);
  }

  return lines.join('\n---\n');
}

/**
 * Extract source references from search results (for UI "View sources" panel).
 */
export function extractSourceRefs(results: SearchResult[]): SourceReference[] {
  return results.map((r) => ({
    source_table: r.source_table,
    source_id: r.source_id,
    snippet: r.content_text.slice(0, 200),
    similarity: r.similarity,
  }));
}

/**
 * Convenience: search + format in one call.
 * Returns both the formatted prompt context and the source references.
 */
export async function retrieveContext(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<{ formatted: string; sources: SourceReference[]; results: SearchResult[] }> {
  const results = await searchEmbeddings(db, query, filters, topK);
  return {
    formatted: formatContextChunks(results),
    sources: extractSourceRefs(results),
    results,
  };
}
