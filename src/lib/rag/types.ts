// ============================================================
// RAG System Types
// ============================================================

/** Allowed content types for rag_embeddings */
export type ContentType =
  | 'message'        // communications.body
  | 'email'          // newsletters (subject + html_body stripped)
  | 'activity'       // activities (subject + description)
  | 'profile'        // contacts (composite document)
  | 'listing'        // listings (composite document)
  | 'recommendation' // agent_recommendations.reasoning
  | 'template'       // message_templates.body
  | 'offer'          // offers + offer_conditions
  | 'faq'            // knowledge_articles (category=faq)
  | 'playbook'       // knowledge_articles (category=playbook)
  | 'script'         // knowledge_articles (category=script)
  | 'process'        // knowledge_articles (category=process)
  | 'explainer'      // knowledge_articles (category=explainer)
  | 'competitor'     // competitive_emails
  | 'social_post';   // social media posts (future)

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

/** Maps source table → content type */
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
  knowledge_articles: 'faq', // overridden by article.category at runtime
  competitive_emails: 'competitor',
};

/** Embedding record for upsert */
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

/** Search result from rag_search() */
export interface SearchResult {
  id: string;
  content_text: string;
  content_summary: string | null;
  source_table: string;
  source_id: string;
  content_type: ContentType;
  contact_id: string | null;
  listing_id: string | null;
  similarity: number;
  source_created_at: string | null;
}

/** Search filters */
export interface SearchFilters {
  contact_id?: string;
  listing_id?: string;
  content_type?: ContentType[];
  date_after?: string;        // ISO date string
}

/** Chatbot intents from Tier 1 Haiku */
export type QueryIntent =
  | 'follow_up'
  | 'newsletter'
  | 'social'
  | 'qa'
  | 'search'
  | 'summarize'
  | 'competitive'
  | 'greeting'
  | 'clarification';

/** Output of Tier 1 Haiku query planner */
export interface QueryPlan {
  intent: QueryIntent;
  search_text: string;
  filters: SearchFilters;
  top_k: number;
  needs_retrieval: boolean;
  escalate_to_opus: boolean;
}

/** A message in a RAG conversation session */
export interface RagMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
  timestamp: string;
}

/** Source reference attached to assistant messages */
export interface SourceReference {
  source_table: string;
  source_id: string;
  snippet: string;
  similarity: number;
}

/** RAG session from rag_sessions table */
export interface RagSession {
  id: string;
  user_email: string;
  ui_context: UIContext;
  tone_preference: 'formal' | 'professional' | 'casual' | 'warm';
  messages: RagMessage[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** UI context injected by chat widget */
export interface UIContext {
  page?: string;               // e.g., '/contacts/[id]', '/newsletters'
  contact_id?: string;
  contact_name?: string;
  contact_type?: string;
  contact_stage?: string;
  listing_id?: string;
  listing_address?: string;
  campaign_id?: string;
  campaign_type?: string;
  draft_content?: string;      // newsletter draft text (truncated)
  segment?: string;            // audience segment label
}

/** Chat API request */
export interface ChatRequest {
  session_id?: string;
  message: string;
  ui_context?: UIContext;
}

/** Chat API response */
export interface ChatResponse {
  session_id: string;
  response: {
    text: string;
    sources: SourceReference[];
  };
  model_tier: 'haiku' | 'sonnet' | 'opus';
  latency_ms: number;
  guardrail_triggered?: string;
}

/** Feedback request */
export interface FeedbackRequest {
  session_id: string;
  message_index: number;
  rating: 'positive' | 'negative';
  feedback_text?: string;
}

/** Ingestion request */
export interface IngestRequest {
  source_table: SourceTable;
  source_id: string;
}

/** Ingestion result */
export interface IngestResult {
  embedded: boolean;
  chunks: number;
  skipped: boolean;
  reason?: string;
}

/** Chunk produced by the chunker */
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
