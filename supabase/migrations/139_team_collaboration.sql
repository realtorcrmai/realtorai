-- ============================================================
-- Migration 139: Team Collaboration Foundation
--
-- Adds team infrastructure for agent-level teams:
-- - users.team_id linkage
-- - tenants table enhancements
-- - tenant_memberships enhancements
-- - team_invites enhancements
-- - contacts: visibility + assigned_to
-- - listings: visibility + listing_agents
-- - appointments: assigned_to + delegation
-- - tasks: assigned_to
-- - deal_agents junction
-- - newsletter team scoping
-- - workflow enrollment dedup
-- - contact_consents table
-- - team_activity_log
-- - audit_log
-- - communications: notes visibility
-- - materialized view for team member lookups
-- - RLS policies for team access
--
-- CAUTION: One-time structural migration. Test thoroughly.
-- ROLLBACK: All changes are additive (no drops). Rollback =
--   drop new tables + drop new columns + drop policies.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Add team_id to users (links user to their team)
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES tenants(id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);

-- ============================================================
-- 2. Enhance tenants table for CRM integration
-- ============================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brokerage_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_members INTEGER NOT NULL DEFAULT 15;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS twilio_number TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#FF7A59';

-- ============================================================
-- 3. Enhance tenant_memberships
-- ============================================================
ALTER TABLE tenant_memberships ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add role constraint (idempotent: drop if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_team_roles'
  ) THEN
    ALTER TABLE tenant_memberships ADD CONSTRAINT valid_team_roles
      CHECK (role IN ('owner', 'admin', 'agent', 'assistant'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_active
  ON tenant_memberships(tenant_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_user_active
  ON tenant_memberships(user_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_memberships_email
  ON tenant_memberships(agent_email) WHERE removed_at IS NULL;

-- Prevent duplicate active memberships in same team
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_unique_active
  ON tenant_memberships(tenant_id, user_id) WHERE removed_at IS NULL AND user_id IS NOT NULL;

-- ============================================================
-- 4. Enhance team_invites
-- ============================================================
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES tenants(id);
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS inviter_name TEXT;
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS team_logo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_invites_token_active
  ON team_invites(invite_token) WHERE status IN ('pending', 'sent');
CREATE INDEX IF NOT EXISTS idx_invites_team
  ON team_invites(team_id) WHERE status IN ('pending', 'sent');

-- ============================================================
-- 5. Contacts: visibility + assignment
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES users(id);

-- Add check constraint idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_visibility_check'
  ) THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_visibility_check
      CHECK (visibility IN ('private', 'team'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_visibility
  ON contacts(realtor_id, visibility) WHERE visibility != 'private';
CREATE INDEX IF NOT EXISTS idx_contacts_assigned
  ON contacts(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================
-- 6. Listings: visibility + co-ownership
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_visibility_check'
  ) THEN
    ALTER TABLE listings ADD CONSTRAINT listings_visibility_check
      CHECK (visibility IN ('private', 'team'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listings_visibility
  ON listings(realtor_id, visibility) WHERE visibility != 'private';

-- Listing co-ownership junction
CREATE TABLE IF NOT EXISTS listing_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'co-list',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_agents_role_check CHECK (role IN ('primary', 'co-list', 'support')),
  CONSTRAINT listing_agents_unique UNIQUE(listing_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_listing_agents_user ON listing_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_agents_listing ON listing_agents(listing_id);

-- ============================================================
-- 7. Appointments: showing delegation
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS delegated_by UUID REFERENCES users(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_assigned
  ON appointments(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================
-- 8. Tasks: assignment
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned
  ON tasks(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================
-- 9. Deal multi-agent ownership
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'primary',
  commission_split_pct DECIMAL(5,2),
  commission_amount DECIMAL(12,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT deal_agents_role_check CHECK (role IN ('primary', 'co-agent', 'referral', 'team_override')),
  CONSTRAINT deal_agents_status_check CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  CONSTRAINT deal_agents_split_check CHECK (commission_split_pct >= 0 AND commission_split_pct <= 100),
  CONSTRAINT deal_agents_unique UNIQUE(deal_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_deal_agents_user ON deal_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_agents_deal ON deal_agents(deal_id);

-- ============================================================
-- 10. Newsletter team scoping
-- ============================================================
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS send_as TEXT DEFAULT 'agent';
ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES tenants(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'newsletters_send_as_check'
  ) THEN
    ALTER TABLE newsletters ADD CONSTRAINT newsletters_send_as_check
      CHECK (send_as IN ('agent', 'team'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_newsletters_team_id ON newsletters(team_id) WHERE team_id IS NOT NULL;

-- Newsletter templates: add scope
ALTER TABLE newsletter_templates ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'personal';
ALTER TABLE newsletter_templates ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES tenants(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'newsletter_templates_scope_check'
  ) THEN
    ALTER TABLE newsletter_templates ADD CONSTRAINT newsletter_templates_scope_check
      CHECK (scope IN ('personal', 'team', 'global'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_newsletter_templates_team_id ON newsletter_templates(team_id) WHERE team_id IS NOT NULL;

-- ============================================================
-- 11. Workflow enrollment dedup
-- ============================================================
ALTER TABLE workflow_enrollments ADD COLUMN IF NOT EXISTS team_dedup_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_enrollment_dedup
  ON workflow_enrollments(team_dedup_key)
  WHERE team_dedup_key IS NOT NULL AND status = 'active';

-- ============================================================
-- 12. Contact consent tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_requested',
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  granted_to_type TEXT,
  granted_to_id UUID,
  source TEXT,
  proof_url TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT consent_type_check CHECK (consent_type IN ('email_marketing', 'sms_marketing', 'data_sharing', 'data_processing')),
  CONSTRAINT consent_status_check CHECK (status IN ('granted', 'withdrawn', 'not_requested', 'expired')),
  CONSTRAINT consent_granted_to_type_check CHECK (granted_to_type IN ('agent', 'team')),
  CONSTRAINT consent_source_check CHECK (source IN ('web_form', 'verbal', 'written', 'imported', 'double_opt_in')),
  CONSTRAINT consent_unique UNIQUE(contact_id, consent_type, granted_to_type, granted_to_id)
);
CREATE INDEX IF NOT EXISTS idx_consents_contact ON contact_consents(contact_id);
CREATE INDEX IF NOT EXISTS idx_consents_expiry ON contact_consents(expires_at)
  WHERE status = 'granted';

-- ============================================================
-- 13. Team activity log
-- ============================================================
CREATE TABLE IF NOT EXISTS team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_activity_team_time
  ON team_activity_log(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_activity_user
  ON team_activity_log(user_id, created_at DESC);

-- ============================================================
-- 14. Audit log (security-critical)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_team_time ON audit_log(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at DESC);

-- ============================================================
-- 15. Communications: notes visibility
-- ============================================================
ALTER TABLE communications ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communications_visibility_check'
  ) THEN
    ALTER TABLE communications ADD CONSTRAINT communications_visibility_check
      CHECK (visibility IN ('private', 'team'));
  END IF;
END $$;

-- ============================================================
-- 16. Materialized view for fast team member lookups
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS team_members_active AS
SELECT DISTINCT ON (tm.tenant_id, u.id)
  tm.tenant_id AS team_id,
  u.id AS user_id,
  u.email,
  u.name,
  tm.role,
  tm.permissions
FROM tenant_memberships tm
JOIN users u ON (u.email = tm.agent_email OR u.id = tm.user_id)
WHERE tm.removed_at IS NULL
ORDER BY tm.tenant_id, u.id, tm.joined_at DESC NULLS LAST;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_active_pk
  ON team_members_active(team_id, user_id);

-- Refresh function (call after membership changes)
CREATE OR REPLACE FUNCTION refresh_team_members()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY team_members_active;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 17. RLS policies for team access
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE listing_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- listing_agents: user can see rows where they are the user or on the same listing
DROP POLICY IF EXISTS "listing_agents_select" ON listing_agents;
CREATE POLICY "listing_agents_select" ON listing_agents FOR SELECT
  USING (
    user_id = auth.uid()
    OR listing_id IN (SELECT listing_id FROM listing_agents la2 WHERE la2.user_id = auth.uid())
    OR listing_id IN (SELECT id FROM listings WHERE realtor_id = auth.uid())
  );
DROP POLICY IF EXISTS "listing_agents_insert" ON listing_agents;
CREATE POLICY "listing_agents_insert" ON listing_agents FOR INSERT
  WITH CHECK (true); -- App-level: only Owner/Admin/listing-owner can insert
DROP POLICY IF EXISTS "listing_agents_delete" ON listing_agents;
CREATE POLICY "listing_agents_delete" ON listing_agents FOR DELETE
  USING (true); -- App-level enforcement

-- deal_agents: user can see their own deal agent rows or rows on deals they're part of
DROP POLICY IF EXISTS "deal_agents_select" ON deal_agents;
CREATE POLICY "deal_agents_select" ON deal_agents FOR SELECT
  USING (
    user_id = auth.uid()
    OR deal_id IN (SELECT deal_id FROM deal_agents da2 WHERE da2.user_id = auth.uid())
    OR deal_id IN (SELECT id FROM deals WHERE realtor_id = auth.uid())
  );
DROP POLICY IF EXISTS "deal_agents_insert" ON deal_agents;
CREATE POLICY "deal_agents_insert" ON deal_agents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "deal_agents_delete" ON deal_agents;
CREATE POLICY "deal_agents_delete" ON deal_agents FOR DELETE USING (true);

-- contact_consents: access follows contact ownership
DROP POLICY IF EXISTS "contact_consents_all" ON contact_consents;
CREATE POLICY "contact_consents_all" ON contact_consents FOR ALL
  USING (
    contact_id IN (SELECT id FROM contacts WHERE realtor_id = auth.uid())
    OR contact_id IN (
      SELECT id FROM contacts WHERE visibility = 'team'
        AND EXISTS (
          SELECT 1 FROM team_members_active tma
          WHERE tma.user_id = auth.uid()
            AND tma.team_id = (SELECT team_id FROM users WHERE id = contacts.realtor_id)
        )
    )
  );

-- team_activity_log: team members can see their team's activity
DROP POLICY IF EXISTS "team_activity_select" ON team_activity_log;
CREATE POLICY "team_activity_select" ON team_activity_log FOR SELECT
  USING (
    team_id IN (
      SELECT tm.tenant_id FROM tenant_memberships tm
      JOIN users u ON u.id = auth.uid()
      WHERE (tm.agent_email = u.email OR tm.user_id = u.id)
        AND tm.removed_at IS NULL
    )
  );
DROP POLICY IF EXISTS "team_activity_insert" ON team_activity_log;
CREATE POLICY "team_activity_insert" ON team_activity_log FOR INSERT
  WITH CHECK (true); -- Service role inserts via app logic

-- audit_log: team-scoped read (Owner/Admin enforced at app level)
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT tm.tenant_id FROM tenant_memberships tm
      JOIN users u ON u.id = auth.uid()
      WHERE (tm.agent_email = u.email OR tm.user_id = u.id)
        AND tm.removed_at IS NULL
        AND tm.role IN ('owner', 'admin')
    )
  );
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- 18. Update existing RLS policies for team visibility
-- ============================================================

-- CONTACTS: add team visibility
-- Note: We create new policies alongside existing ones.
-- Existing policy: realtor_id = auth.uid()
-- New policy adds: OR (visibility='team' AND same team) OR assigned_to
DROP POLICY IF EXISTS "contacts_select_with_team" ON contacts;
CREATE POLICY "contacts_select_with_team" ON contacts FOR SELECT USING (
  realtor_id = auth.uid()
  OR assigned_to = auth.uid()
  OR (
    visibility = 'team'
    AND EXISTS (
      SELECT 1 FROM team_members_active tma
      WHERE tma.user_id = auth.uid()
        AND tma.team_id = (SELECT team_id FROM users WHERE id = contacts.realtor_id)
    )
  )
);

-- LISTINGS: add team visibility
DROP POLICY IF EXISTS "listings_select_with_team" ON listings;
CREATE POLICY "listings_select_with_team" ON listings FOR SELECT USING (
  realtor_id = auth.uid()
  OR (
    visibility = 'team'
    AND EXISTS (
      SELECT 1 FROM team_members_active tma
      WHERE tma.user_id = auth.uid()
        AND tma.team_id = (SELECT team_id FROM users WHERE id = listings.realtor_id)
    )
  )
  OR id IN (SELECT listing_id FROM listing_agents WHERE user_id = auth.uid())
);

-- APPOINTMENTS: team showings
DROP POLICY IF EXISTS "appointments_select_with_team" ON appointments;
CREATE POLICY "appointments_select_with_team" ON appointments FOR SELECT USING (
  realtor_id = auth.uid()
  OR assigned_to = auth.uid()
  OR listing_id IN (
    SELECT id FROM listings WHERE
      visibility = 'team'
      AND EXISTS (
        SELECT 1 FROM team_members_active tma
        WHERE tma.user_id = auth.uid()
          AND tma.team_id = (SELECT team_id FROM users WHERE id = listings.realtor_id)
      )
    UNION
    SELECT listing_id FROM listing_agents WHERE user_id = auth.uid()
  )
);

-- TASKS: assigned visibility
DROP POLICY IF EXISTS "tasks_select_with_team" ON tasks;
CREATE POLICY "tasks_select_with_team" ON tasks FOR SELECT USING (
  realtor_id = auth.uid()
  OR assigned_to = auth.uid()
);

-- COMMUNICATIONS: team-visible notes
DROP POLICY IF EXISTS "communications_select_with_team" ON communications;
CREATE POLICY "communications_select_with_team" ON communications FOR SELECT USING (
  realtor_id = auth.uid()
  OR (
    visibility = 'team'
    AND EXISTS (
      SELECT 1 FROM team_members_active tma
      WHERE tma.user_id = auth.uid()
        AND tma.team_id = (SELECT team_id FROM users WHERE id = communications.realtor_id)
    )
  )
);

COMMIT;
