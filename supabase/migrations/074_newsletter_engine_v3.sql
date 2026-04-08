-- Migration: 074_newsletter_engine_v3.sql
-- Purpose:   Foundation tables for the Newsletter Engine v3 service
--            (`realtors360-newsletter/`). See MASTER_NEWSLETTER_PLAN.md §4.4.
--
-- Adds:
--   1. email_events            — event log consumed by the newsletter worker
--   2. email_event_rules       — per-realtor mapping of event_type → email_type
--   3. saved_searches          — buyer search criteria for match alerts
--   4. market_stats_cache      — cached external market data (M5)
--   5. neighbourhood_data      — curated content for neighbourhood guides (M4)
--   6. email_template_registry — email_type → React Email component metadata
--
-- Plus:
--   - Adds source_event_id and email_type columns to existing newsletters table
--   - Seeds default rules + template registry for the demo realtor
--
-- RLS: All new tables enforce auth.uid() = realtor_id (or service-role bypass).

-- ──────────────────────────────────────────────────────────────────────────
-- 1. email_events
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            uuid NOT NULL,
  event_type            text NOT NULL,
  event_data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  affected_contact_ids  uuid[],
  contact_id            uuid REFERENCES contacts(id) ON DELETE SET NULL,
  listing_id            uuid REFERENCES listings(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processed', 'failed', 'ignored')),
  processed_at          timestamptz,
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_realtor    ON email_events(realtor_id);
CREATE INDEX IF NOT EXISTS idx_email_events_status     ON email_events(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_events_type       ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_created    ON email_events(created_at);

ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_events_tenant_select ON email_events
  FOR SELECT TO authenticated
  USING (realtor_id = auth.uid());

CREATE POLICY email_events_tenant_insert ON email_events
  FOR INSERT TO authenticated
  WITH CHECK (realtor_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 2. email_event_rules
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_event_rules (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id                uuid NOT NULL,
  event_type                text NOT NULL,
  email_type                text NOT NULL,
  template_id               text NOT NULL,
  contact_filter            jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_mode                 text NOT NULL DEFAULT 'review'
                              CHECK (send_mode IN ('review', 'auto')),
  frequency_cap_per_week    int  NOT NULL DEFAULT 2,
  min_hours_between_sends   int  NOT NULL DEFAULT 24,
  enabled                   boolean NOT NULL DEFAULT true,
  priority                  int  NOT NULL DEFAULT 50,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE(realtor_id, event_type, email_type)
);

CREATE INDEX IF NOT EXISTS idx_email_event_rules_realtor_event
  ON email_event_rules(realtor_id, event_type) WHERE enabled = true;

ALTER TABLE email_event_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_event_rules_tenant_all ON email_event_rules
  FOR ALL TO authenticated
  USING (realtor_id = auth.uid())
  WITH CHECK (realtor_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 3. saved_searches
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_searches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id          uuid NOT NULL,
  contact_id          uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  name                text,
  criteria            jsonb NOT NULL,
  last_match_check    timestamptz,
  last_match_count    int NOT NULL DEFAULT 0,
  enabled             boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(realtor_id, contact_id, name)
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_realtor ON saved_searches(realtor_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_enabled ON saved_searches(enabled) WHERE enabled = true;

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_searches_tenant_all ON saved_searches
  FOR ALL TO authenticated
  USING (realtor_id = auth.uid())
  WITH CHECK (realtor_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 4. market_stats_cache
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_stats_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id    uuid,
  area          text NOT NULL,
  stat_type     text NOT NULL,
  period        text,
  data          jsonb NOT NULL,
  source        text,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  UNIQUE(area, stat_type, period)
);

CREATE INDEX IF NOT EXISTS idx_market_stats_area_type ON market_stats_cache(area, stat_type);

-- Public read (it's market data, no PII), service-role write only
ALTER TABLE market_stats_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY market_stats_cache_read ON market_stats_cache
  FOR SELECT TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────────────────────
-- 5. neighbourhood_data
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS neighbourhood_data (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area        text UNIQUE NOT NULL,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE neighbourhood_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY neighbourhood_data_read ON neighbourhood_data
  FOR SELECT TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────────────────────
-- 6. email_template_registry
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_template_registry (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type               text UNIQUE NOT NULL,
  template_component       text NOT NULL,
  description              text,
  category                 text,
  supports_dynamic         boolean NOT NULL DEFAULT true,
  required_data_fields     text[],
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_template_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_template_registry_read ON email_template_registry
  FOR SELECT TO authenticated USING (true);

-- ──────────────────────────────────────────────────────────────────────────
-- 7. Extensions to existing newsletters table
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS source_event_id uuid REFERENCES email_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_type      text;

CREATE INDEX IF NOT EXISTS idx_newsletters_email_type ON newsletters(email_type);
CREATE INDEX IF NOT EXISTS idx_newsletters_contact_sent ON newsletters(contact_id, sent_at);

-- ──────────────────────────────────────────────────────────────────────────
-- 8. Seed: template registry
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO email_template_registry
  (email_type, template_component, description, category, required_data_fields)
VALUES
  ('saved_search_match', 'SavedSearchMatchEmail',
   'Sent when a new active listing matches a buyer''s saved search',
   'workflow_trigger',
   ARRAY['contact_id', 'listing_id'])
ON CONFLICT (email_type) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- 9. Seed: default rules for demo realtor
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO email_event_rules
  (realtor_id, event_type, email_type, template_id, send_mode,
   frequency_cap_per_week, min_hours_between_sends, priority)
VALUES
  ('7de22757-dd3a-4a4f-a088-c422746e88d4',
   'listing_matched_search', 'saved_search_match', 'SavedSearchMatchEmail',
   'auto', 3, 12, 80)
ON CONFLICT (realtor_id, event_type, email_type) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- updated_at trigger for email_event_rules
-- ──────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_event_rules_updated_at ON email_event_rules;
CREATE TRIGGER trg_email_event_rules_updated_at
  BEFORE UPDATE ON email_event_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- DOWN (manual rollback only — Supabase does not auto-run)
-- ──────────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS email_template_registry CASCADE;
-- DROP TABLE IF EXISTS neighbourhood_data CASCADE;
-- DROP TABLE IF EXISTS market_stats_cache CASCADE;
-- DROP TABLE IF EXISTS saved_searches CASCADE;
-- DROP TABLE IF EXISTS email_event_rules CASCADE;
-- DROP TABLE IF EXISTS email_events CASCADE;
-- ALTER TABLE newsletters DROP COLUMN IF EXISTS source_event_id;
-- ALTER TABLE newsletters DROP COLUMN IF EXISTS email_type;
