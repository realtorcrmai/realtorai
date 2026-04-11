/**
 * RAG fallback search (Postgres FTS).
 *
 * Ported from `realestate-crm/src/lib/rag/fallback.ts` (M4). The CRM original
 * also exports `formatRawResultsAsFallback` and `getDefaultPlan` — those are
 * for the assistant chat UI when Claude itself is down. The newsletter
 * service only needs `fullTextSearch`, which the retriever calls when the
 * Voyage embedding step or the `rag_search` RPC fails.
 *
 * Behaviour preservation:
 *   - tsquery built by stripping punctuation, splitting on whitespace,
 *     filtering tokens of length 1, capping at 10 terms, joining with ' & '
 *   - structured filters (contact_id / listing_id / content_type / date_after)
 *     applied identically to the semantic path
 *   - similarity score fixed at 0.5 (FTS doesn't produce a cosine score)
 *   - rows annotated with `freshness: 'unknown'` so callers can warn the
 *     user that they're seeing degraded-mode results
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../../lib/logger.js';
import { RETRIEVAL } from './constants.js';
import type { SearchFilters, SearchResult } from './types.js';

/** Strict shape of a row returned from the rag_embeddings table. */
type EmbeddingRow = {
  id: string;
  content_text: string;
  content_summary: string | null;
  source_table: string;
  source_id: string;
  content_type: SearchResult['content_type'];
  contact_id: string | null;
  listing_id: string | null;
  source_created_at: string | null;
  created_at: string | null;
};

/**
 * Build a Postgres tsquery string from a free-text query.
 *
 * Pure helper — extracted so it can be unit-tested without a DB. Mirrors
 * the in-place logic in the CRM original; behaviour is identical.
 */
export function buildTsQuery(query: string): string {
  const words = query
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 10);
  return words.join(' & ');
}

/**
 * Full-text search over `rag_embeddings` using `to_tsvector` / `to_tsquery`.
 *
 * Returns at most `topK` rows (capped at `RETRIEVAL.MAX_TOP_K`). Throws on
 * DB errors so the caller can decide whether to retry or surface to the
 * user — the retriever wraps this in a try/catch and treats failure as
 * "no results".
 */
export async function fullTextSearch(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<SearchResult[]> {
  const tsquery = buildTsQuery(query);
  if (tsquery.length === 0) return [];

  let rpcQuery = db
    .from('rag_embeddings')
    .select(
      'id, content_text, content_summary, source_table, source_id, content_type, contact_id, listing_id, source_created_at, created_at'
    )
    .textSearch('content_text', tsquery, { type: 'plain', config: 'english' })
    .limit(Math.min(topK, RETRIEVAL.MAX_TOP_K));

  if (filters.contact_id) {
    rpcQuery = rpcQuery.eq('contact_id', filters.contact_id);
  }
  if (filters.listing_id) {
    rpcQuery = rpcQuery.eq('listing_id', filters.listing_id);
  }
  if (filters.content_type && filters.content_type.length > 0) {
    rpcQuery = rpcQuery.in('content_type', filters.content_type);
  }
  if (filters.date_after) {
    rpcQuery = rpcQuery.gte('source_created_at', filters.date_after);
  }

  const { data, error } = await rpcQuery;

  if (error) {
    logger.warn({ err: error, query: query.slice(0, 80) }, 'rag fallback: FTS query failed');
    throw new Error(`Full-text search failed: ${error.message}`);
  }

  const rows = (data ?? []) as EmbeddingRow[];

  return rows.map((row): SearchResult => ({
    id: row.id,
    content_text: row.content_text,
    content_summary: row.content_summary,
    source_table: row.source_table,
    source_id: row.source_id,
    content_type: row.content_type,
    contact_id: row.contact_id,
    listing_id: row.listing_id,
    similarity: 0.5,
    source_created_at: row.source_created_at,
    freshness: 'unknown',
  }));
}
