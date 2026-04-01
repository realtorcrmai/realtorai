-- ============================================================================
-- RAG Tenant Isolation — Add realtor_id to RAG tables
--
-- Fixes CRITICAL security issue: all RAG tables had no tenant scoping.
-- Any authenticated user could see all realtors' data.
--
-- Tables affected: rag_embeddings, rag_sessions, rag_feedback, rag_audit_log
-- ============================================================================

-- 1. Add realtor_id columns (nullable first for backfill)
ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES auth.users(id);
ALTER TABLE rag_sessions ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES auth.users(id);
ALTER TABLE rag_feedback ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES auth.users(id);
ALTER TABLE rag_audit_log ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES auth.users(id);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_realtor ON rag_embeddings(realtor_id);
CREATE INDEX IF NOT EXISTS idx_rag_sessions_realtor ON rag_sessions(realtor_id);
CREATE INDEX IF NOT EXISTS idx_rag_feedback_realtor ON rag_feedback(realtor_id);
CREATE INDEX IF NOT EXISTS idx_rag_audit_log_realtor ON rag_audit_log(realtor_id);

-- 3. Backfill realtor_id from user_email
-- rag_sessions has user_email — map to users.id
UPDATE rag_sessions SET realtor_id = u.id
FROM auth.users u
WHERE rag_sessions.user_email = u.email
  AND rag_sessions.realtor_id IS NULL;

-- rag_feedback via session_id → rag_sessions.realtor_id
UPDATE rag_feedback SET realtor_id = s.realtor_id
FROM rag_sessions s
WHERE rag_feedback.session_id = s.id
  AND rag_feedback.realtor_id IS NULL;

-- rag_audit_log has user_email
UPDATE rag_audit_log SET realtor_id = u.id
FROM auth.users u
WHERE rag_audit_log.user_email = u.email
  AND rag_audit_log.realtor_id IS NULL;

-- rag_embeddings — backfill from the source records' realtor_id
-- For embeddings from contacts:
UPDATE rag_embeddings SET realtor_id = c.realtor_id
FROM contacts c
WHERE rag_embeddings.source_table = 'contacts'
  AND rag_embeddings.source_id = c.id
  AND rag_embeddings.realtor_id IS NULL;

-- For embeddings from listings:
UPDATE rag_embeddings SET realtor_id = l.realtor_id
FROM listings l
WHERE rag_embeddings.source_table = 'listings'
  AND rag_embeddings.source_id = l.id
  AND rag_embeddings.realtor_id IS NULL;

-- For embeddings from newsletters:
UPDATE rag_embeddings SET realtor_id = n.realtor_id
FROM newsletters n
WHERE rag_embeddings.source_table = 'newsletters'
  AND rag_embeddings.source_id = n.id
  AND rag_embeddings.realtor_id IS NULL;

-- For knowledge_articles (global) — assign to first admin user
UPDATE rag_embeddings SET realtor_id = (SELECT id FROM auth.users LIMIT 1)
WHERE rag_embeddings.source_table = 'knowledge_articles'
  AND rag_embeddings.realtor_id IS NULL;

-- For any remaining unbackfilled rows — assign to first user (safety net)
UPDATE rag_embeddings SET realtor_id = (SELECT id FROM auth.users LIMIT 1)
WHERE rag_embeddings.realtor_id IS NULL;

UPDATE rag_sessions SET realtor_id = (SELECT id FROM auth.users LIMIT 1)
WHERE rag_sessions.realtor_id IS NULL;

UPDATE rag_audit_log SET realtor_id = (SELECT id FROM auth.users LIMIT 1)
WHERE rag_audit_log.realtor_id IS NULL;

-- 4. Set NOT NULL after backfill
ALTER TABLE rag_embeddings ALTER COLUMN realtor_id SET NOT NULL;
ALTER TABLE rag_sessions ALTER COLUMN realtor_id SET NOT NULL;
ALTER TABLE rag_audit_log ALTER COLUMN realtor_id SET NOT NULL;
-- rag_feedback may have orphaned rows — leave nullable

-- 5. Immutability trigger (prevent realtor_id changes after insert)
CREATE OR REPLACE FUNCTION prevent_rag_realtor_id_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.realtor_id IS DISTINCT FROM NEW.realtor_id THEN
    RAISE EXCEPTION 'realtor_id cannot be changed after insert';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rag_embeddings_realtor_immutable') THEN
    CREATE TRIGGER trg_rag_embeddings_realtor_immutable
      BEFORE UPDATE ON rag_embeddings FOR EACH ROW
      EXECUTE FUNCTION prevent_rag_realtor_id_change();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rag_sessions_realtor_immutable') THEN
    CREATE TRIGGER trg_rag_sessions_realtor_immutable
      BEFORE UPDATE ON rag_sessions FOR EACH ROW
      EXECUTE FUNCTION prevent_rag_realtor_id_change();
  END IF;
END $$;

-- 6. Drop old permissive RLS policies and create tenant-scoped ones
DROP POLICY IF EXISTS "Allow all authenticated" ON rag_embeddings;
DROP POLICY IF EXISTS "Allow all authenticated" ON rag_sessions;
DROP POLICY IF EXISTS "Allow all authenticated" ON rag_feedback;
DROP POLICY IF EXISTS "Allow all authenticated" ON rag_audit_log;

-- New tenant-scoped policies
-- Note: admin users bypass RLS via service role key (createAdminClient)
-- Regular users are scoped by realtor_id
CREATE POLICY tenant_rls_rag_embeddings ON rag_embeddings
  FOR ALL USING (realtor_id = auth.uid()::uuid);

CREATE POLICY tenant_rls_rag_sessions ON rag_sessions
  FOR ALL USING (realtor_id = auth.uid()::uuid);

CREATE POLICY tenant_rls_rag_feedback ON rag_feedback
  FOR ALL USING (realtor_id IS NULL OR realtor_id = auth.uid()::uuid);

CREATE POLICY tenant_rls_rag_audit_log ON rag_audit_log
  FOR ALL USING (realtor_id = auth.uid()::uuid);

-- 7. Update rag_search RPC to accept and filter by realtor_id
CREATE OR REPLACE FUNCTION rag_search(
    query_embedding vector(1024),
    p_realtor_id uuid DEFAULT NULL,
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
    WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
      AND (p_realtor_id IS NULL OR e.realtor_id = p_realtor_id)
      AND (filter_types IS NULL OR e.content_type = ANY(filter_types))
      AND (filter_contact_id IS NULL OR e.contact_id = filter_contact_id)
      AND (filter_listing_id IS NULL OR e.listing_id = filter_listing_id)
      AND (filter_after IS NULL OR e.source_created_at >= filter_after)
    ORDER BY similarity DESC
    LIMIT match_count;
$$;
