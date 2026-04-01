-- ============================================================
-- 055: RAG System — pgvector + unified embedding store + sessions + audit
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Unified embedding store
CREATE TABLE rag_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tracking
    source_table TEXT NOT NULL,
    source_id UUID NOT NULL,
    chunk_index INTEGER DEFAULT 0,

    -- Content
    content_text TEXT NOT NULL,
    content_summary TEXT,

    -- Vector (Voyage-3-large = 1024 dimensions)
    embedding vector(1024) NOT NULL,

    -- Scoping & filtering
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'message', 'email', 'activity', 'profile', 'listing',
        'recommendation', 'template', 'offer',
        'faq', 'playbook', 'script', 'process', 'explainer',
        'competitor', 'social_post'
    )),
    channel TEXT,
    direction TEXT,
    audience_type TEXT,
    topic TEXT,

    -- Dedup
    content_hash TEXT NOT NULL,

    -- Timestamps
    source_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(source_table, source_id, chunk_index)
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_rag_embedding_hnsw
    ON rag_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Filtered search indexes
CREATE INDEX idx_rag_contact ON rag_embeddings(contact_id);
CREATE INDEX idx_rag_listing ON rag_embeddings(listing_id);
CREATE INDEX idx_rag_content_type ON rag_embeddings(content_type);
CREATE INDEX idx_rag_source ON rag_embeddings(source_table, source_id);
CREATE INDEX idx_rag_hash ON rag_embeddings(content_hash);
CREATE INDEX idx_rag_source_created ON rag_embeddings(source_created_at DESC);

-- Semantic search function
CREATE OR REPLACE FUNCTION rag_search(
    query_embedding vector(1024),
    filter_types text[] DEFAULT NULL,
    filter_contact_id uuid DEFAULT NULL,
    filter_listing_id uuid DEFAULT NULL,
    filter_after timestamptz DEFAULT NULL,
    match_count int DEFAULT 5,
    match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
    id uuid,
    content_text text,
    content_summary text,
    source_table text,
    source_id uuid,
    content_type text,
    contact_id uuid,
    listing_id uuid,
    similarity float,
    source_created_at timestamptz
)
LANGUAGE sql STABLE AS $$
    SELECT
        e.id,
        e.content_text,
        e.content_summary,
        e.source_table,
        e.source_id,
        e.content_type,
        e.contact_id,
        e.listing_id,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.source_created_at
    FROM rag_embeddings e
    WHERE (filter_types IS NULL OR e.content_type = ANY(filter_types))
      AND (filter_contact_id IS NULL OR e.contact_id = filter_contact_id)
      AND (filter_listing_id IS NULL OR e.listing_id = filter_listing_id)
      AND (filter_after IS NULL OR e.source_created_at >= filter_after)
      AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- 3. Chat sessions
CREATE TABLE rag_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    ui_context JSONB DEFAULT '{}',
    tone_preference TEXT DEFAULT 'professional' CHECK (tone_preference IN ('formal', 'professional', 'casual', 'warm')),
    messages JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_sessions_user ON rag_sessions(user_email, is_active, updated_at DESC);

-- 4. Response feedback
CREATE TABLE rag_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES rag_sessions(id) ON DELETE CASCADE,
    message_index INTEGER NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_feedback_session ON rag_feedback(session_id);

-- 5. Audit log
CREATE TABLE rag_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES rag_sessions(id) ON DELETE SET NULL,
    user_email TEXT,
    query_text TEXT NOT NULL,
    intent TEXT,
    query_plan JSONB,
    retrieved_ids UUID[],
    retrieved_scores FLOAT[],
    model_tier TEXT CHECK (model_tier IN ('haiku', 'sonnet', 'opus')),
    response_text TEXT,
    latency_ms INTEGER,
    guardrail_triggered TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_audit_time ON rag_audit_log(created_at DESC);
CREATE INDEX idx_rag_audit_user ON rag_audit_log(user_email, created_at DESC);

-- 6. Knowledge base articles
CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('faq', 'playbook', 'script', 'explainer', 'process')),
    audience_type TEXT DEFAULT 'all' CHECK (audience_type IN ('all', 'buyer', 'seller', 'investor', 'agent')),
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_category ON knowledge_articles(category, is_active);

-- 7. Competitive emails
CREATE TABLE competitive_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    from_email TEXT,
    subject TEXT NOT NULL,
    body_text TEXT NOT NULL,
    html_body TEXT,
    email_type TEXT,
    design_analysis JSONB,
    content_analysis JSONB,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comp_email_source ON competitive_emails(source, created_at DESC);

-- 8. Competitive insights
CREATE TABLE competitive_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL CHECK (insight_type IN ('trend', 'gap', 'recommendation', 'design_pattern')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    source_emails UUID[],
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    applicable_to TEXT DEFAULT 'all',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comp_insights_type ON competitive_insights(insight_type, created_at DESC);

-- RLS policies (single-tenant, authenticated access)
ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_rag_embeddings" ON rag_embeddings FOR ALL USING (true);
CREATE POLICY "auth_rag_sessions" ON rag_sessions FOR ALL USING (true);
CREATE POLICY "auth_rag_feedback" ON rag_feedback FOR ALL USING (true);
CREATE POLICY "auth_rag_audit" ON rag_audit_log FOR ALL USING (true);
CREATE POLICY "auth_knowledge" ON knowledge_articles FOR ALL USING (true);
CREATE POLICY "auth_competitive_emails" ON competitive_emails FOR ALL USING (true);
CREATE POLICY "auth_competitive_insights" ON competitive_insights FOR ALL USING (true);
