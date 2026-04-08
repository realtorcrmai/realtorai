/**
 * RAG types — minimal subset.
 *
 * Ported from `realestate-crm/src/lib/rag/types.ts`. M3-A batch 1 only needs
 * the types touched by the rag-backfill cron path: SourceTable, ContentType,
 * EmbeddingRecord, IngestResult, TextChunk. The chat/session types stay in
 * the CRM until M3-D pulls in the retriever.
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
