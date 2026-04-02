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
 * Hybrid search: combine semantic (Voyage) + full-text search (tsvector)
 * using Reciprocal Rank Fusion (RRF). Returns better recall than either alone.
 * Falls back to semantic-only if FTS fails.
 */
export async function hybridSearch(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<SearchResult[]> {
  const RRF_K = 60; // RRF constant (standard value)

  // Run both searches in parallel
  const [semanticResults, ftsResults] = await Promise.allSettled([
    searchEmbeddings(db, query, filters, topK * 2),
    fullTextSearch(db, query, filters, topK * 2),
  ]);

  const semantic = semanticResults.status === 'fulfilled' ? semanticResults.value : [];
  const fts = ftsResults.status === 'fulfilled' ? (ftsResults.value as SearchResult[]) : [];

  // If only one source has results, return it directly
  if (semantic.length === 0 && fts.length === 0) return [];
  if (fts.length === 0) return semantic.slice(0, topK);
  if (semantic.length === 0) return fts.slice(0, topK);

  // Reciprocal Rank Fusion: score = sum(1 / (k + rank)) across both lists
  const rrfScores = new Map<string, { score: number; result: SearchResult }>();

  for (let i = 0; i < semantic.length; i++) {
    const key = `${semantic[i].source_table}:${semantic[i].source_id}:${i}`;
    const existing = rrfScores.get(key);
    const rrfScore = 1 / (RRF_K + i + 1);
    rrfScores.set(key, {
      score: (existing?.score ?? 0) + rrfScore,
      result: existing?.result ?? semantic[i],
    });
  }

  for (let i = 0; i < fts.length; i++) {
    const key = `${fts[i].source_table}:${fts[i].source_id}:${i}`;
    const existing = rrfScores.get(key);
    const rrfScore = 1 / (RRF_K + i + 1);
    rrfScores.set(key, {
      score: (existing?.score ?? 0) + rrfScore,
      result: existing?.result ?? fts[i],
    });
  }

  // Sort by RRF score descending, return top-K
  return [...rrfScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((entry) => entry.result);
}

/**
 * Convenience: search + format in one call.
 * Uses hybrid search (semantic + FTS fusion) for better recall.
 * Returns both the formatted prompt context and the source references.
 */
export async function retrieveContext(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<{ formatted: string; sources: SourceReference[]; results: SearchResult[] }> {
  const results = await hybridSearch(db, query, filters, topK);
  return {
    formatted: formatContextChunks(results),
    sources: extractSourceRefs(results),
    results,
  };
}
