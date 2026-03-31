-- ============================================================
-- 058: RAG System Fixes — missing column, idempotent indexes, composite indexes
-- ============================================================

-- 1. Add missing estimated_cost_usd column to audit log
ALTER TABLE rag_audit_log ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(10, 4) DEFAULT NULL;

-- 2. Composite indexes for common filtered queries (performance at scale)
CREATE INDEX IF NOT EXISTS idx_rag_contact_type ON rag_embeddings(contact_id, content_type);
CREATE INDEX IF NOT EXISTS idx_rag_listing_type ON rag_embeddings(listing_id, content_type);
CREATE INDEX IF NOT EXISTS idx_rag_type_created ON rag_embeddings(content_type, source_created_at DESC);

-- 3. Make original indexes idempotent (no-op if they already exist from 055)
CREATE INDEX IF NOT EXISTS idx_rag_embedding_hnsw
    ON rag_embeddings USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_rag_contact ON rag_embeddings(contact_id);
CREATE INDEX IF NOT EXISTS idx_rag_listing ON rag_embeddings(listing_id);
CREATE INDEX IF NOT EXISTS idx_rag_content_type ON rag_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_rag_source ON rag_embeddings(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_rag_hash ON rag_embeddings(content_hash);
CREATE INDEX IF NOT EXISTS idx_rag_source_created ON rag_embeddings(source_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_sessions_user ON rag_sessions(user_email, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_feedback_session ON rag_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_rag_audit_time ON rag_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_audit_user ON rag_audit_log(user_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_articles(category, is_active);
CREATE INDEX IF NOT EXISTS idx_comp_email_source ON competitive_emails(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comp_insights_type ON competitive_insights(insight_type, created_at DESC);

-- 4. Ensure RLS is enabled (idempotent — safe to re-run)
ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_insights ENABLE ROW LEVEL SECURITY;

-- 5. Idempotent policies (drop + create to avoid "already exists" errors)
DO $$ BEGIN
  DROP POLICY IF EXISTS "auth_rag_embeddings" ON rag_embeddings;
  CREATE POLICY "auth_rag_embeddings" ON rag_embeddings FOR ALL USING (true);
  DROP POLICY IF EXISTS "auth_rag_sessions" ON rag_sessions;
  CREATE POLICY "auth_rag_sessions" ON rag_sessions FOR ALL USING (true);
  DROP POLICY IF EXISTS "auth_rag_feedback" ON rag_feedback;
  CREATE POLICY "auth_rag_feedback" ON rag_feedback FOR ALL USING (true);
  DROP POLICY IF EXISTS "auth_rag_audit" ON rag_audit_log;
  CREATE POLICY "auth_rag_audit" ON rag_audit_log FOR ALL USING (true);
  DROP POLICY IF EXISTS "auth_knowledge" ON knowledge_articles;
  CREATE POLICY "auth_knowledge" ON knowledge_articles FOR ALL USING (true);
  DROP POLICY IF EXISTS "auth_competitive_emails" ON competitive_emails;
  CREATE POLICY "auth_competitive_emails" ON competitive_emails FOR ALL USING (true);
  DROP POLICY IF EXISTS "auth_competitive_insights" ON competitive_insights;
  CREATE POLICY "auth_competitive_insights" ON competitive_insights FOR ALL USING (true);
END $$;

-- 6. Atomic message append function (prevents concurrent message race condition)
CREATE OR REPLACE FUNCTION rag_append_message(
    p_session_id uuid,
    p_message jsonb
)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE rag_sessions
    SET messages = messages || jsonb_build_array(p_message),
        updated_at = now()
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;
END;
$$;

-- 7. Session cleanup: delete inactive sessions older than 7 days
CREATE OR REPLACE FUNCTION rag_cleanup_sessions()
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM rag_sessions
    WHERE is_active = false
      AND updated_at < now() - interval '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
