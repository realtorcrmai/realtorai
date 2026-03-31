// ============================================================
// Fallback Module — degraded-mode responses when services are down
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { SearchResult, SearchFilters, QueryPlan } from './types';
// Use SearchResult with optional freshness field
type FreshnessAnnotatedResult = SearchResult & { freshness?: 'fresh' | 'stale' | 'unknown' };
import { RETRIEVAL } from './constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseKey);
}

// ---------- Scenario 1: Claude API down ----------

/**
 * When Claude API is unavailable, format raw retriever results as a readable
 * bullet-point list so the user still gets useful information.
 */
export function formatRawResultsAsFallback(
  results: FreshnessAnnotatedResult[]
): string {
  if (results.length === 0) {
    return "I'm temporarily unable to generate AI responses and found no matching records. Please try again in a moment or check the relevant page directly.";
  }

  const header =
    "I'm temporarily unable to generate AI responses. Here are the relevant records I found:";
  const bullets = results.slice(0, 10).map((r) => {
    const date = r.source_created_at
      ? new Date(r.source_created_at).toISOString().split('T')[0]
      : 'unknown date';
    const staleNote = r.freshness === 'stale' ? ' (may be outdated)' : '';
    const snippet = r.content_text.slice(0, 300);
    return `- **${r.source_table}** (${date}, relevance: ${(r.similarity * 100).toFixed(0)}%${staleNote}): ${snippet}`;
  });

  return `${header}\n\n${bullets.join('\n\n')}`;
}

// ---------- Scenario 2: Voyage API down (embedding fails) ----------

/**
 * Fall back to Supabase full-text search using to_tsvector/to_tsquery
 * when Voyage embedding API is unavailable.
 */
export async function fullTextSearch(
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<FreshnessAnnotatedResult[]> {
  const admin = getAdmin();

  // Build a tsquery from the user's query: split words, join with &
  const words = query
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 10); // limit to 10 terms

  if (words.length === 0) return [];

  const tsquery = words.join(' & ');

  // Build a raw SQL query via Supabase RPC or direct query
  let rpcQuery = admin
    .from('rag_embeddings')
    .select('id, content_text, content_summary, source_table, source_id, content_type, contact_id, listing_id, source_created_at, created_at')
    .textSearch('content_text', tsquery, { type: 'plain', config: 'english' })
    .limit(Math.min(topK, RETRIEVAL.MAX_TOP_K));

  // Apply structured filters
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
    throw new Error(`Full-text search failed: ${error.message}`);
  }

  // Map to FreshnessAnnotatedResult format (no similarity score from FTS, use 0.5 as default)
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    content_text: row.content_text as string,
    content_summary: (row.content_summary as string) ?? null,
    source_table: row.source_table as string,
    source_id: row.source_id as string,
    content_type: row.content_type as SearchResult['content_type'],
    contact_id: (row.contact_id as string) ?? null,
    listing_id: (row.listing_id as string) ?? null,
    similarity: 0.5, // FTS does not produce a cosine similarity score
    source_created_at: (row.source_created_at as string) ?? null,
    freshness: 'unknown' as const,
  }));
}

// ---------- Scenario 3: Supabase down ----------

/**
 * Return a static message when the database is unreachable.
 */
export const SUPABASE_DOWN_MESSAGE =
  'The database is temporarily unavailable. Please try again in a moment.';

// ---------- Default plan for when the planner (Claude Haiku) fails ----------

/**
 * Returns a safe default query plan when Tier 1 planner is unavailable.
 */
export function getDefaultPlan(query: string, filters: SearchFilters = {}): QueryPlan {
  return {
    intent: 'qa',
    search_text: query,
    filters,
    top_k: 5,
    needs_retrieval: true,
    escalate_to_opus: false,
  };
}
