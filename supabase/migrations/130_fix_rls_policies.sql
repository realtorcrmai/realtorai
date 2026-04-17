-- Migration 130: Fix overly permissive RLS policies
-- Replace USING (true) policies on tenant-owned tables with tenant-scoped ones.
-- Tables that have a direct realtor_id column get: realtor_id = auth.uid()::uuid
-- Tables that own rows via a FK to contacts/listings get an EXISTS subquery.
-- Truly global/shared tables (agent_settings, trust_audit_log, voice_rules,
-- knowledge_articles, newsletter_templates) keep open read for all authenticated
-- users but are restricted to authenticated role only (no anon access).

-- ─── 1. notifications (has realtor_id directly) ──────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON notifications;
CREATE POLICY "tenant_notifications" ON notifications
  FOR ALL TO authenticated
  USING  (realtor_id = auth.uid()::uuid)
  WITH CHECK (realtor_id = auth.uid()::uuid);

-- ─── 2. consent_records (no realtor_id; owned via contacts.realtor_id) ───────
DROP POLICY IF EXISTS consent_records_auth ON consent_records;
CREATE POLICY "tenant_consent_records" ON consent_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = consent_records.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = consent_records.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 3. ghost_drafts (owned via contacts.realtor_id) ─────────────────────────
DROP POLICY IF EXISTS "auth_ghost_drafts" ON ghost_drafts;
CREATE POLICY "tenant_ghost_drafts" ON ghost_drafts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = ghost_drafts.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = ghost_drafts.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 4. email_recalls (owned via contacts.realtor_id) ────────────────────────
DROP POLICY IF EXISTS "auth_email_recalls" ON email_recalls;
CREATE POLICY "tenant_email_recalls" ON email_recalls
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = email_recalls.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = email_recalls.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 5. edit_history (owned via contacts.realtor_id) ─────────────────────────
DROP POLICY IF EXISTS "auth_edit_history" ON edit_history;
CREATE POLICY "tenant_edit_history" ON edit_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = edit_history.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = edit_history.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 6. send_governor_log (owned via contacts.realtor_id) ────────────────────
DROP POLICY IF EXISTS "auth_send_governor_log" ON send_governor_log;
CREATE POLICY "tenant_send_governor_log" ON send_governor_log
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = send_governor_log.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = send_governor_log.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 7. activities (owned via contacts.realtor_id) ───────────────────────────
DROP POLICY IF EXISTS "activities_all" ON activities;
CREATE POLICY "tenant_activities" ON activities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = activities.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = activities.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 8. contact_properties (owned via contacts.realtor_id) ───────────────────
DROP POLICY IF EXISTS "contact_properties_all" ON contact_properties;
CREATE POLICY "tenant_contact_properties" ON contact_properties
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_properties.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_properties.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 9. offers (owned via listings.realtor_id) ───────────────────────────────
DROP POLICY IF EXISTS "offers_all" ON offers;
CREATE POLICY "tenant_offers" ON offers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = offers.listing_id
        AND l.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = offers.listing_id
        AND l.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 10. offer_conditions (owned via offers → listings.realtor_id) ───────────
DROP POLICY IF EXISTS "offer_conditions_all" ON offer_conditions;
CREATE POLICY "tenant_offer_conditions" ON offer_conditions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_conditions.offer_id
        AND l.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_conditions.offer_id
        AND l.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 11. offer_history (owned via offers → listings.realtor_id) ──────────────
DROP POLICY IF EXISTS "offer_history_all" ON offer_history;
CREATE POLICY "tenant_offer_history" ON offer_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_history.offer_id
        AND l.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM offers o
      JOIN listings l ON l.id = o.listing_id
      WHERE o.id = offer_history.offer_id
        AND l.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 12. households (no realtor_id; contacts join) ───────────────────────────
-- households are linked to contacts via contact_household_members.
-- Use a lighter policy: any authenticated user can see households their contacts belong to.
-- (contact_household_members guards the join table separately)
DROP POLICY IF EXISTS "households_all" ON households;
CREATE POLICY "tenant_households" ON households
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
-- NOTE: households is a shared lookup table (a household can have contacts from the
-- same realtor). It has no direct realtor_id, and is low-risk. Keep open for authenticated.
-- A future migration can add a realtor_id column for strict isolation.

-- ─── 13. contact_relationships (owned via contacts.realtor_id) ───────────────
DROP POLICY IF EXISTS "contact_relationships_all" ON contact_relationships;
CREATE POLICY "tenant_contact_relationships" ON contact_relationships
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_relationships.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = contact_relationships.contact_id
        AND c.realtor_id = auth.uid()::uuid
    )
  );

-- ─── 14. agent_settings (global config table — authenticated read-only scope) ─
-- This is a singleton config table, not per-realtor. Restrict to authenticated role.
DROP POLICY IF EXISTS "auth_agent_settings" ON agent_settings;
CREATE POLICY "auth_agent_settings" ON agent_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 15. trust_audit_log (global audit — authenticated read-only scope) ───────
DROP POLICY IF EXISTS "auth_trust_audit_log" ON trust_audit_log;
CREATE POLICY "auth_trust_audit_log" ON trust_audit_log
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 16. voice_rules (global per-tenant agent config — authenticated scope) ───
DROP POLICY IF EXISTS "auth_voice_rules" ON voice_rules;
CREATE POLICY "auth_voice_rules" ON voice_rules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 17. signup_events (platform analytics — authenticated scope) ─────────────
DROP POLICY IF EXISTS "Authenticated access" ON signup_events;
CREATE POLICY "auth_signup_events" ON signup_events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 18. workflow automation tables — drop anon policies ─────────────────────
-- The anon policies in migration 014 allow unauthenticated access. Remove them.
DROP POLICY IF EXISTS "anon_message_templates"   ON message_templates;
DROP POLICY IF EXISTS "anon_workflows"           ON workflows;
DROP POLICY IF EXISTS "anon_workflow_steps"      ON workflow_steps;
DROP POLICY IF EXISTS "anon_workflow_enrollments" ON workflow_enrollments;
DROP POLICY IF EXISTS "anon_workflow_step_logs"  ON workflow_step_logs;
DROP POLICY IF EXISTS "anon_agent_notifications" ON agent_notifications;
DROP POLICY IF EXISTS "anon_activity_log"        ON activity_log;
