/**
 * RAG types.
 *
 * Ported from `realestate-crm/src/lib/rag/types.ts`. The M3-A batch 1 port
 * brought over only the types needed by rag-backfill: SourceTable,
 * ContentType, EmbeddingRecord, IngestResult, TextChunk. M4 extends with
 * the retriever-side types: SearchResult, SearchFilters, SourceReference.
 *
 * The CRM original also defines QueryIntent, QueryPlan, ChatSession etc.
 * for the assistant UI — those stay in the CRM until/unless the newsletter
 * service grows a chat surface.
 */

/** Allowed content types for rag_embeddings */
export type ContentType =
  | 'message'
  | 'email'
  | 'activity'
  | 'profile'
  | 'listing'
  | 'recommendation'
  | 'template'
  | 'offer'
  | 'faq'
  | 'playbook'
  | 'script'
  | 'process'
  | 'explainer'
  | 'competitor'
  | 'social_post';

/** Source tables that can be embedded */
export type SourceTable =
  | 'communications'
  | 'activities'
  | 'newsletters'
  | 'contacts'
  | 'listings'
  | 'agent_recommendations'
  | 'message_templates'
  | 'offers'
  | 'offer_conditions'
  | 'knowledge_articles'
  | 'competitive_emails';

/** Default source → content type mapping (knowledge_articles overridden at runtime) */
export const SOURCE_TO_CONTENT_TYPE: Record<SourceTable, ContentType> = {
  communications: 'message',
  activities: 'activity',
  newsletters: 'email',
  contacts: 'profile',
  listings: 'listing',
  agent_recommendations: 'recommendation',
  message_templates: 'template',
  offers: 'offer',
  offer_conditions: 'offer',
  knowledge_articles: 'faq',
  competitive_emails: 'competitor',
};

/** Embedding row for upsert into rag_embeddings */
export interface EmbeddingRecord {
  source_table: SourceTable;
  source_id: string;
  chunk_index: number;
  content_text: string;
  content_summary?: string;
  embedding: number[];
  contact_id?: string;
  listing_id?: string;
  content_type: ContentType;
  channel?: string;
  direction?: string;
  audience_type?: string;
  topic?: string;
  content_hash: string;
  source_created_at?: string;
}

/** Result of ingesting a single record */
export interface IngestResult {
  embedded: boolean;
  chunks: number;
  skipped: boolean;
  reason?: string;
}

/** A chunk produced by `chunkRecord` */
export interface TextChunk {
  text: string;
  index: number;
  metadata: {
    contact_id?: string;
    listing_id?: string;
    channel?: string;
    direction?: string;
    audience_type?: string;
    topic?: string;
    source_created_at?: string;
  };
}

/** Per-table chunking config (mirrors realestate-crm/src/lib/rag/constants.ts CHUNK_CONFIG) */
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

/** Approximate token count from character count (1 token ≈ 4 chars). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/* ───────────────────── Retriever-side types (M4) ───────────────────── */

/** Structured filters for hybrid retrieval. */
export interface SearchFilters {
  /** Restrict to specific content types. */
  content_type?: ContentType[];
  /** Scope to a single contact. */
  contact_id?: string;
  /** Scope to a single listing. */
  listing_id?: string;
  /** Only return chunks whose source row was created on/after this ISO date. */
  date_after?: string;
}

/**
 * A retrieval hit returned by `searchEmbeddings` / `hybridSearch`.
 *
 * Mirrors the row shape from the `rag_search` Postgres function and the
 * tsvector fallback in `fallback.ts`. `similarity` is a cosine score in
 * [0, 1] for semantic results, or a fixed 0.5 for FTS-only fallback rows.
 */
export interface SearchResult {
  id?: string;
  source_table: string;
  source_id: string;
  content_type?: ContentType | null;
  content_text: string;
  content_summary?: string | null;
  contact_id?: string | null;
  listing_id?: string | null;
  similarity: number;
  source_created_at?: string | null;
  /** Set by the FTS fallback so callers can warn the user. */
  freshness?: 'fresh' | 'stale' | 'unknown';
}

/** Light reference returned alongside `formatted` for UI source attribution. */
export interface SourceReference {
  source_table: string;
  source_id: string;
  snippet: string;
  similarity: number;
}
