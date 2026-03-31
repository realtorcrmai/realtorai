-- ============================================================
-- 059: RAG Security & Compliance — RLS, audit enrichment, PIPEDA, retention
-- ============================================================

-- 1. Fix RLS on rag_sessions: scope to user's own sessions only
--    (Previously USING (true) — any user could see any session)
DO $$ BEGIN
  DROP POLICY IF EXISTS "auth_rag_sessions" ON rag_sessions;
  CREATE POLICY "own_rag_sessions" ON rag_sessions FOR ALL
    USING (user_email = current_setting('request.jwt.claims', true)::jsonb ->> 'email');

  -- Feedback scoped via session FK cascade
  DROP POLICY IF EXISTS "auth_rag_feedback" ON rag_feedback;
  CREATE POLICY "own_rag_feedback" ON rag_feedback FOR ALL
    USING (session_id IN (
      SELECT id FROM rag_sessions
      WHERE user_email = current_setting('request.jwt.claims', true)::jsonb ->> 'email'
    ));

  -- Audit log scoped to own user
  DROP POLICY IF EXISTS "auth_rag_audit" ON rag_audit_log;
  CREATE POLICY "own_rag_audit" ON rag_audit_log FOR ALL
    USING (user_email = current_setting('request.jwt.claims', true)::jsonb ->> 'email');
END $$;

-- 2. Add context tracking columns to audit log (know WHICH contact/listing was accessed)
ALTER TABLE rag_audit_log ADD COLUMN IF NOT EXISTS context_contact_id UUID DEFAULT NULL;
ALTER TABLE rag_audit_log ADD COLUMN IF NOT EXISTS context_listing_id UUID DEFAULT NULL;
ALTER TABLE rag_audit_log ADD COLUMN IF NOT EXISTS context_page TEXT DEFAULT NULL;

-- 3. Add context_changed flag to sessions (tracks when contact_id changes mid-session)
ALTER TABLE rag_sessions ADD COLUMN IF NOT EXISTS previous_context JSONB DEFAULT NULL;

-- 4. Extend cleanup to respect retention tiers
--    Normal sessions: 30 days (not 7)
--    Sessions that accessed FINTRAC data: 5 years
CREATE OR REPLACE FUNCTION rag_cleanup_sessions()
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete inactive normal sessions older than 30 days
    DELETE FROM rag_sessions
    WHERE is_active = false
      AND updated_at < now() - interval '30 days'
      AND (ui_context ->> 'accessed_fintrac') IS DISTINCT FROM 'true';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- FINTRAC-flagged sessions: keep for 5 years
    DELETE FROM rag_sessions
    WHERE is_active = false
      AND updated_at < now() - interval '5 years'
      AND (ui_context ->> 'accessed_fintrac') = 'true';
    deleted_count := deleted_count + ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- 5. Data export function (PIPEDA compliance — user can request all their data)
CREATE OR REPLACE FUNCTION rag_export_user_data(p_user_email text)
RETURNS TABLE (
    data_type text,
    data_id uuid,
    data_content jsonb,
    created_at timestamptz
)
LANGUAGE sql STABLE AS $$
    -- Sessions
    (SELECT 'session'::text, s.id, jsonb_build_object(
        'ui_context', s.ui_context,
        'tone_preference', s.tone_preference,
        'messages', s.messages,
        'is_active', s.is_active
    ), s.created_at
    FROM rag_sessions s WHERE s.user_email = p_user_email)

    UNION ALL

    -- Feedback
    (SELECT 'feedback'::text, f.id, jsonb_build_object(
        'rating', f.rating,
        'feedback_text', f.feedback_text,
        'message_index', f.message_index
    ), f.created_at
    FROM rag_feedback f
    JOIN rag_sessions s ON f.session_id = s.id
    WHERE s.user_email = p_user_email)

    UNION ALL

    -- Audit log
    (SELECT 'audit'::text, a.id, jsonb_build_object(
        'query_text', a.query_text,
        'intent', a.intent,
        'model_tier', a.model_tier,
        'latency_ms', a.latency_ms
    ), a.created_at
    FROM rag_audit_log a WHERE a.user_email = p_user_email)
$$;

-- 6. Data deletion function (PIPEDA right to be forgotten)
CREATE OR REPLACE FUNCTION rag_delete_user_data(p_user_email text)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    deleted_count integer := 0;
    session_count integer;
    audit_count integer;
BEGIN
    -- Delete feedback (cascades from sessions)
    -- Delete sessions
    DELETE FROM rag_sessions WHERE user_email = p_user_email;
    GET DIAGNOSTICS session_count = ROW_COUNT;
    deleted_count := deleted_count + session_count;

    -- Delete audit logs
    DELETE FROM rag_audit_log WHERE user_email = p_user_email;
    GET DIAGNOSTICS audit_count = ROW_COUNT;
    deleted_count := deleted_count + audit_count;

    RETURN deleted_count;
END;
$$;
