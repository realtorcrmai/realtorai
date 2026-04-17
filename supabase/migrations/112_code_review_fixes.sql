-- 112_code_review_fixes.sql
--
-- Code review fixes: RLS hardening, type correction, and missing indexes.
-- All statements are idempotent (IF NOT EXISTS / DROP IF EXISTS).

-- ============================================================================
-- 1. Fix smart_lists: change realtor_id from TEXT to UUID with FK,
--    and replace the permissive USING(true) RLS policy with tenant scoping.
-- ============================================================================

-- 1a. Drop the open RLS policy that allows cross-tenant access.
DROP POLICY IF EXISTS "smart_lists_all" ON smart_lists;
DROP POLICY IF EXISTS "tenant_isolation_smart_lists" ON smart_lists;

-- 1b. Convert realtor_id from TEXT to UUID and add FK to auth.users.
-- ALTER TYPE is idempotent-safe: if already UUID this is a no-op cast.
ALTER TABLE smart_lists
  ALTER COLUMN realtor_id SET DATA TYPE UUID USING realtor_id::uuid;

-- Add FK constraint (skip if it already exists).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'smart_lists_realtor_id_fkey'
      AND table_name = 'smart_lists'
  ) THEN
    ALTER TABLE smart_lists
      ADD CONSTRAINT smart_lists_realtor_id_fkey
      FOREIGN KEY (realtor_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 1c. Recreate RLS policy with proper tenant isolation.
CREATE POLICY "tenant_isolation_smart_lists"
  ON smart_lists
  FOR ALL
  TO authenticated
  USING (realtor_id = auth.uid()::uuid)
  WITH CHECK (realtor_id = auth.uid()::uuid);

-- ============================================================================
-- 2. Add missing indexes on frequently queried columns.
--    All use IF NOT EXISTS for safe re-runs.
-- ============================================================================

-- 2a. contacts(realtor_id, lifecycle_stage) — used by smart list filters
--     and the contacts list page stage grouping.
CREATE INDEX IF NOT EXISTS idx_contacts_realtor_lifecycle
  ON contacts(realtor_id, lifecycle_stage);

-- 2b. appointments(realtor_id, buyer_agent_email) — used by showing
--     lookups when matching inbound buyer-agent emails.
CREATE INDEX IF NOT EXISTS idx_appointments_realtor_buyer_email
  ON appointments(realtor_id, buyer_agent_email);

-- 2c. newsletter_events(event_type) — used by analytics queries that
--     aggregate events by type (open, click, bounce, etc.).
CREATE INDEX IF NOT EXISTS idx_newsletter_events_event_type
  ON newsletter_events(event_type);

-- 2d. Composite (realtor_id, created_at DESC) on contacts — used by
--     default sort order on the contacts list page.
CREATE INDEX IF NOT EXISTS idx_contacts_realtor_created
  ON contacts(realtor_id, created_at DESC);

-- 2e. Composite (realtor_id, created_at DESC) on listings — used by
--     default sort order on the listings list page.
CREATE INDEX IF NOT EXISTS idx_listings_realtor_created
  ON listings(realtor_id, created_at DESC);

-- ============================================================================
-- 3. Add explicit RLS policies on global/shared tables that are
--    intentionally public but currently rely on implicit defaults.
--    Explicit FOR SELECT USING (true) documents the intent and prevents
--    accidental lockouts if RLS gets enabled later.
-- ============================================================================

-- 3a. newsletter_templates — shared templates visible to all authenticated users.
ALTER TABLE IF EXISTS newsletter_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "newsletter_templates_public_read" ON newsletter_templates;
CREATE POLICY "newsletter_templates_public_read"
  ON newsletter_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- 3b. email_template_registry — shared template registry.
ALTER TABLE IF EXISTS email_template_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_template_registry_public_read" ON email_template_registry;
CREATE POLICY "email_template_registry_public_read"
  ON email_template_registry
  FOR SELECT
  TO authenticated
  USING (true);

-- 3c. knowledge_articles — shared knowledge base for RAG.
ALTER TABLE IF EXISTS knowledge_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge_articles_public_read" ON knowledge_articles;
CREATE POLICY "knowledge_articles_public_read"
  ON knowledge_articles
  FOR SELECT
  TO authenticated
  USING (true);

-- 3d. neighbourhood_data — shared neighbourhood reference data.
ALTER TABLE IF EXISTS neighbourhood_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "neighbourhood_data_public_read" ON neighbourhood_data;
CREATE POLICY "neighbourhood_data_public_read"
  ON neighbourhood_data
  FOR SELECT
  TO authenticated
  USING (true);

-- 3e. market_stats_cache — shared market statistics cache.
ALTER TABLE IF EXISTS market_stats_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_stats_cache_public_read" ON market_stats_cache;
CREATE POLICY "market_stats_cache_public_read"
  ON market_stats_cache
  FOR SELECT
  TO authenticated
  USING (true);
