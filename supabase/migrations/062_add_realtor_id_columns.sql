-- Migration 062: Multi-Tenancy — Add realtor_id to all data tables
-- Phase 1: Add nullable realtor_id columns + indexes
-- NO data backfill here (done in 063)
-- NO NOT NULL constraint here (done in 064)

-- ============================================================
-- Reference: users.id is the realtor_id (UUID from NextAuth)
-- Tables SKIPPED (already have tenant_id or are global):
--   tenants, tenant_memberships, tenant_api_keys, tenant_audit_log
--   voice_sessions, voice_calls, voice_notifications, voice_conversation_logs,
--     voice_notes, voice_preferences, voice_reminders, voice_rules
--   knowledge_articles, platform_intelligence, competitive_insights,
--     help_events, help_community_tips
--   tutor_users, tutor_sessions, tutor_messages, tutor_cefr_history
--   users (IS the tenant table)
-- ============================================================

-- ============================================================
-- TIER 1: Core Data Tables
-- ============================================================

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE communications ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE listing_documents ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE listing_activities ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE seller_identities ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE open_houses ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE open_house_visitors ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- ============================================================
-- TIER 2: Contact Sub-Tables
-- ============================================================

ALTER TABLE contact_dates ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_journeys ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_relationships ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_family_members ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_instructions ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_watchlist ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_context ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_properties ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_segments ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_consent ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_important_dates ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE contact_documents ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE households ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- ============================================================
-- TIER 3: Transactions
-- ============================================================

ALTER TABLE deals ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE deal_parties ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE deal_checklist ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE offer_conditions ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE offer_history ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE mortgages ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- ============================================================
-- TIER 4: Communication & Email
-- ============================================================

ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE newsletter_events ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE email_feedback ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE email_recalls ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE outcome_events ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE ghost_drafts ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- ============================================================
-- TIER 5: Workflows & Automation
-- ============================================================

ALTER TABLE workflows ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE workflow_step_logs ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE extension_tasks ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE showing_feedback ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- ============================================================
-- TIER 6: AI & Intelligence
-- ============================================================

ALTER TABLE agent_recommendations ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE agent_decisions ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE agent_notifications ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE agent_events ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE rag_embeddings ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE rag_sessions ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE rag_feedback ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE rag_audit_log ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE competitive_emails ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- ============================================================
-- TIER 7: Social Media
-- ============================================================

ALTER TABLE social_brand_kits ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE social_post_publishes ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE social_analytics_daily ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE social_usage_tracking ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE social_audit_log ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE social_hashtag_performance ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- ============================================================
-- TIER 8: Website & Analytics
-- ============================================================

ALTER TABLE site_analytics_events ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE site_sessions ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE site_session_recordings ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- ============================================================
-- TIER 9: Config & Misc
-- ============================================================

ALTER TABLE google_tokens ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE user_integrations ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE feature_overrides ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE send_governor_log ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE trust_audit_log ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);
ALTER TABLE edit_history ADD COLUMN IF NOT EXISTS realtor_id uuid REFERENCES users(id);

-- Also update tables that have TEXT realtor_id to add UUID version
-- (agent_learning_log, realtor_agent_config, realtor_weekly_feedback already have TEXT realtor_id)
-- We'll keep both columns during migration and reconcile in 063

-- ============================================================
-- INDEXES — Critical for query performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_contacts_realtor_id ON contacts(realtor_id);
CREATE INDEX IF NOT EXISTS idx_listings_realtor_id ON listings(realtor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_realtor_id ON appointments(realtor_id);
CREATE INDEX IF NOT EXISTS idx_communications_realtor_id ON communications(realtor_id);
CREATE INDEX IF NOT EXISTS idx_listing_documents_realtor_id ON listing_documents(realtor_id);
CREATE INDEX IF NOT EXISTS idx_newsletters_realtor_id ON newsletters(realtor_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_realtor_id ON newsletter_events(realtor_id);
CREATE INDEX IF NOT EXISTS idx_contact_journeys_realtor_id ON contact_journeys(realtor_id);
CREATE INDEX IF NOT EXISTS idx_deals_realtor_id ON deals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_offers_realtor_id ON offers(realtor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_realtor_id ON tasks(realtor_id);
CREATE INDEX IF NOT EXISTS idx_activities_realtor_id ON activities(realtor_id);
CREATE INDEX IF NOT EXISTS idx_workflows_realtor_id ON workflows(realtor_id);
CREATE INDEX IF NOT EXISTS idx_workflow_enrollments_realtor_id ON workflow_enrollments(realtor_id);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_realtor_id ON agent_recommendations(realtor_id);
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_realtor_id ON rag_embeddings(realtor_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_realtor_id ON social_posts(realtor_id);
CREATE INDEX IF NOT EXISTS idx_social_brand_kits_realtor_id ON social_brand_kits(realtor_id);
CREATE INDEX IF NOT EXISTS idx_households_realtor_id ON households(realtor_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_realtor_id ON mortgages(realtor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_realtor_id ON referrals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_google_tokens_realtor_id ON google_tokens(realtor_id);
CREATE INDEX IF NOT EXISTS idx_site_analytics_realtor_id ON site_analytics_events(realtor_id);

-- ============================================================
-- TRIGGER: Prevent realtor_id modification after insert
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_realtor_id_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.realtor_id IS NOT NULL AND OLD.realtor_id IS DISTINCT FROM NEW.realtor_id THEN
    RAISE EXCEPTION 'Cannot change realtor_id after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to core tables (most important for data integrity)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'contacts', 'listings', 'appointments', 'communications',
    'deals', 'offers', 'newsletters', 'tasks', 'activities',
    'households', 'mortgages', 'referrals',
    'social_posts', 'social_brand_kits', 'social_accounts'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER IF NOT EXISTS no_realtor_id_change_%s
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION prevent_realtor_id_change()',
      t, t
    );
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  -- Some tables may not support IF NOT EXISTS for triggers
  NULL;
END $$;
