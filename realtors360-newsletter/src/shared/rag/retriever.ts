/**
 * RAG retriever — hybrid semantic + FTS over `rag_embeddings`.
 *
 * Ported from `realestate-crm/src/lib/rag/retriever.ts` (M4). Replaces the
 * M3-D stub. Behaviour preserved exactly:
 *
 *   - HyDE: Claude Haiku generates a hypothetical answer, embeds it as a
 *     "fake document", and uses that embedding for one of the three search
 *     legs. Best-effort — falls back to plain query embedding on failure
 *     and is wrapped in try/catch so it never blocks the main path.
 *
 *   - Hybrid: 3-way Reciprocal Rank Fusion across:
 *       1. semantic search (Voyage embed + rag_search RPC)
 *       2. HyDE search    (Voyage embed of hypothetical doc + rag_search RPC)
 *       3. full-text fallback (Postgres tsvector via fallback.ts)
 *     RRF constant K = 60 (standard value). Returns top-K after fusion.
 *
 *   - Single-source short-circuit: if 2 of 3 sources return zero rows the
 *     surviving list is returned directly without RRF (CRM original behaviour).
 *
 *   - Failure modes:
 *       * semantic search throws → caller catches and falls through to FTS only
 *       * HyDE generation throws → empty embedding, contributes zero rows
 *       * FTS throws → caller catches and treats as zero rows
 *       * all three fail → empty result, lead-scorer / orchestrator runs without RAG
 *
 *   - Token budget: `formatContextChunks` caps total characters at
 *     `RETRIEVAL.MAX_CONTEXT_TOKENS * 4` (rough chars-per-token).
 *
 * Differences from CRM original:
 *
 *   - SupabaseClient is injected (CRM hard-codes a singleton). The lead-
 *     scorer and any future caller pass their own DB handle so the test
 *     suite can mock it.
 *
 *   - Uses the newsletter service's existing `lib/voyage.ts` (which is the
 *     M3-A port of the CRM `lib/rag/embeddings.ts`) instead of importing
 *     from `./embeddings` — the embedding wrapper lives one level up in
 *     this service layout.
 *
 *   - Anthropic client is instantiated lazily inside `hydeExpand` so the
 *     module can be imported without an API key (matters for tests). The
 *     CRM original creates the client at module load.
 *
 *   - All `as Record<string, unknown>` and similar widening casts have been
 *     replaced with narrow row types (HC-1).
 *
 *   - Structured pino logging on retry/fallback paths instead of the CRM
 *     original's `console.warn`.
 *
 * Public shape (locked by the lead-scorer call site at
 * `shared/ai-agent/lead-scorer.ts:351`):
 *
 *   retrieveContext(db, query, filters, topK)
 *     → { formatted: string, sources: SourceReference[], results: SearchResult[] }
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { embedQuery, embedText } from '../../lib/voyage.js';
import { logger } from '../../lib/logger.js';
import { RETRIEVAL, HYDE_MODEL } from './constants.js';
import { fullTextSearch } from './fallback.js';
import type { SearchResult, SearchFilters, SourceReference } from './types.js';

/* ───────────────────────────── HyDE expander ───────────────────────────── */

let _anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic();
  }
  return _anthropicClient;
}

const HYDE_SYSTEM_PROMPT =
  'Generate a short, factual paragraph that would answer this question in a real estate CRM context. Write as if it were a document in the database. Be specific with plausible details.';

/**
 * Hypothetical Document Embedding.
 *
 * Generates a short hypothetical answer to the user's query, then embeds
 * that as a document. The resulting vector is closer in semantic space to
 * actual answer documents than the original query, which improves recall
 * on vague / conversational queries (the standard HyDE result).
 *
 * Strictly best-effort: any failure (no API key, rate limit, generation
 * error) falls back to a plain query embedding so the caller still gets
 * one of the three RRF legs.
 */
export async function hydeExpand(query: string): Promise<number[]> {
  try {
    const response = await getAnthropic().messages.create({
      model: HYDE_MODEL,
      max_tokens: 200,
      system: HYDE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    });

    const first = response.content[0];
    const hypothetical = first?.type === 'text' ? first.text : '';
    if (!hypothetical) return embedQuery(query);

    return await embedText(hypothetical);
  } catch (err) {
    logger.debug({ err }, 'rag retriever: HyDE generation failed, falling back to query embedding');
    return embedQuery(query);
  }
}

/* ─────────────────────────── Semantic search ─────────────────────────── */

/**
 * Format a Float32 array into the Postgres `vector` literal expected by
 * the `rag_search` RPC. Pulled out so it can be unit-tested.
 */
export function formatVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

type RagSearchArgs = {
  query_embedding: string;
  filter_types: string[] | null;
  filter_contact_id: string | null;
  filter_listing_id: string | null;
  filter_after: string | null;
  match_count: number;
  match_threshold: number;
};

function buildRagSearchArgs(
  embedding: number[],
  filters: SearchFilters,
  topK: number
): RagSearchArgs {
  return {
    query_embedding: formatVectorLiteral(embedding),
    filter_types: filters.content_type ?? null,
    filter_contact_id: filters.contact_id ?? null,
    filter_listing_id: filters.listing_id ?? null,
    filter_after: filters.date_after ?? null,
    match_count: Math.min(topK, RETRIEVAL.MAX_TOP_K),
    match_threshold: RETRIEVAL.SIMILARITY_THRESHOLD,
  };
}

/**
 * Plain semantic search: embed the query, call rag_search RPC, return rows.
 *
 * On RPC failure this falls through to `fullTextSearch`. If THAT also fails
 * the function throws — callers (`hybridSearch`) catch and treat as zero
 * rows so the overall flow degrades gracefully.
 */
export async function searchEmbeddings(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<SearchResult[]> {
  const queryEmbedding = await embedQuery(query);

  const { data, error } = await db.rpc('rag_search', buildRagSearchArgs(queryEmbedding, filters, topK));

  if (error) {
    logger.warn(
      { err: error, query: query.slice(0, 80) },
      'rag retriever: semantic search failed, falling through to FTS'
    );
    return await fullTextSearch(db, query, filters, topK);
  }

  return (data ?? []) as SearchResult[];
}

/**
 * HyDE-augmented semantic search.
 *
 * Same as `searchEmbeddings` but the embedding comes from the hypothetical
 * answer, not the literal query. Best-effort — any failure (HyDE generation,
 * RPC error, network blip) returns an empty list so the RRF stage in
 * `hybridSearch` simply ignores this leg.
 */
async function hydeSearchEmbeddings(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<SearchResult[]> {
  try {
    const hydeEmbedding = await hydeExpand(query);

    const { data, error } = await db.rpc(
      'rag_search',
      buildRagSearchArgs(hydeEmbedding, filters, topK)
    );

    if (error) {
      logger.debug({ err: error }, 'rag retriever: HyDE rpc returned error, dropping leg');
      return [];
    }
    return (data ?? []) as SearchResult[];
  } catch (err) {
    logger.debug({ err }, 'rag retriever: HyDE leg threw, dropping');
    return [];
  }
}

/* ──────────────────────────── Result formatting ──────────────────────────── */

/**
 * Format search results into a numbered, dated, citation-friendly block
 * for an LLM prompt. Caps total characters at `RETRIEVAL.MAX_CONTEXT_TOKENS
 * * 4` (the standard 1-token-≈-4-chars heuristic).
 *
 * Pure helper — no I/O, fully unit-tested.
 */
export function formatContextChunks(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const maxChars = RETRIEVAL.MAX_CONTEXT_TOKENS * 4;
  const lines: string[] = [];
  let totalChars = 0;

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
 * Strip a result list down to the minimal `SourceReference` shape used by
 * the assistant UI's "View sources" panel. The newsletter service does not
 * have such a UI yet — these refs are returned alongside `formatted` so a
 * future surface (e.g. an audit log of "what context did the agent see when
 * it sent this email") has a stable shape to consume.
 */
export function extractSourceRefs(results: SearchResult[]): SourceReference[] {
  return results.map((r) => ({
    source_table: r.source_table,
    source_id: r.source_id,
    snippet: r.content_text.slice(0, 200),
    similarity: r.similarity,
  }));
}

/* ──────────────────────────── Hybrid search ──────────────────────────── */

/** RRF constant. 60 is the standard value from the original RRF paper. */
const RRF_K = 60;

/**
 * 3-way Reciprocal Rank Fusion across (semantic, HyDE, FTS) result lists.
 *
 * For each result list and each rank position `r` (0-indexed), the score
 * contribution is `1 / (RRF_K + r + 1)`. Scores from all three lists are
 * summed per `(source_table, source_id)` key. The fused list is sorted
 * descending and truncated to `topK`.
 *
 * Pure helper — no I/O, fully unit-tested.
 */
export function reciprocalRankFusion(
  lists: SearchResult[][],
  topK: number
): SearchResult[] {
  const scores = new Map<string, { score: number; result: SearchResult }>();

  for (const list of lists) {
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const key = `${r.source_table}:${r.source_id}`;
      const existing = scores.get(key);
      const rrf = 1 / (RRF_K + i + 1);
      scores.set(key, {
        score: (existing?.score ?? 0) + rrf,
        result: existing?.result ?? r,
      });
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((entry) => entry.result);
}

/**
 * Hybrid retrieval: semantic + HyDE + FTS in parallel, fused by RRF.
 *
 * If only one of the three legs returns non-empty results, that leg is
 * returned directly (no RRF) — fusing a single list against nothing is a
 * no-op. If all three are empty, returns `[]`.
 *
 * The three legs run via `Promise.allSettled` so a failure in one (network,
 * rate limit, RPC timeout) does not block the others.
 */
export async function hybridSearch(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<SearchResult[]> {
  const widerK = topK * 2;
  const [semanticSettled, hydeSettled, ftsSettled] = await Promise.allSettled([
    searchEmbeddings(db, query, filters, widerK),
    hydeSearchEmbeddings(db, query, filters, widerK),
    fullTextSearch(db, query, filters, widerK).catch((err) => {
      logger.debug({ err }, 'rag retriever: FTS leg threw, dropping');
      return [] as SearchResult[];
    }),
  ]);

  const semantic = semanticSettled.status === 'fulfilled' ? semanticSettled.value : [];
  const hyde = hydeSettled.status === 'fulfilled' ? hydeSettled.value : [];
  const fts = ftsSettled.status === 'fulfilled' ? ftsSettled.value : [];

  const nonEmpty = [semantic, hyde, fts].filter((l) => l.length > 0);
  if (nonEmpty.length === 0) return [];
  if (nonEmpty.length === 1) return nonEmpty[0].slice(0, topK);

  return reciprocalRankFusion([semantic, hyde, fts], topK);
}

/* ──────────────────────────── Public surface ──────────────────────────── */

export interface RetrieveContextResult {
  formatted: string;
  sources: SourceReference[];
  results: SearchResult[];
}

/**
 * Convenience entry point: hybrid search + format + extract refs in one call.
 *
 * The lead scorer (and any future caller) only needs `formatted`. `sources`
 * and `results` are returned for downstream uses (audit logs, agent traces,
 * UI source panels) and to keep the signature drop-in compatible with the
 * CRM original.
 */
export async function retrieveContext(
  db: SupabaseClient,
  query: string,
  filters: SearchFilters = {},
  topK: number = RETRIEVAL.DEFAULT_TOP_K
): Promise<RetrieveContextResult> {
  const results = await hybridSearch(db, query, filters, topK);
  return {
    formatted: formatContextChunks(results),
    sources: extractSourceRefs(results),
    results,
  };
}

// Re-export the types so existing imports of `from '../rag/retriever.js'`
// keep working — the M3-D stub also re-exported these locally and the lead
// scorer doesn't yet import them (just calls retrieveContext), but future
// callers might.
export type { SearchFilters, SearchResult, SourceReference };
