-- ============================================================
-- Rollback for Migration 139: Team Collaboration Foundation
--
-- Removes all team-related additions. Run this to revert to
-- pre-team state. Data in new tables will be LOST.
-- ============================================================

BEGIN;

-- Drop RLS policies on existing tables
DROP POLICY IF EXISTS "contacts_select_with_team" ON contacts;
DROP POLICY IF EXISTS "listings_select_with_team" ON listings;
DROP POLICY IF EXISTS "appointments_select_with_team" ON appointments;
DROP POLICY IF EXISTS "tasks_select_with_team" ON tasks;
DROP POLICY IF EXISTS "communications_select_with_team" ON communications;

-- Drop new tables (cascade drops their policies/indexes)
DROP TABLE IF EXISTS team_activity_log CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS contact_consents CASCADE;
DROP TABLE IF EXISTS deal_agents CASCADE;
DROP TABLE IF EXISTS listing_agents CASCADE;

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS team_members_active;
DROP FUNCTION IF EXISTS refresh_team_members();

-- Remove columns from contacts
ALTER TABLE contacts DROP COLUMN IF EXISTS visibility;
ALTER TABLE contacts DROP COLUMN IF EXISTS assigned_to;
ALTER TABLE contacts DROP COLUMN IF EXISTS shared_at;
ALTER TABLE contacts DROP COLUMN IF EXISTS shared_by;

-- Remove columns from listings
ALTER TABLE listings DROP COLUMN IF EXISTS visibility;
ALTER TABLE listings DROP COLUMN IF EXISTS shared_at;

-- Remove columns from appointments
ALTER TABLE appointments DROP COLUMN IF EXISTS assigned_to;
ALTER TABLE appointments DROP COLUMN IF EXISTS delegated_by;
ALTER TABLE appointments DROP COLUMN IF EXISTS delegated_at;

-- Remove columns from tasks
ALTER TABLE tasks DROP COLUMN IF EXISTS assigned_to;

-- Remove columns from communications
ALTER TABLE communications DROP COLUMN IF EXISTS visibility;

-- Remove columns from newsletters
ALTER TABLE newsletters DROP COLUMN IF EXISTS send_as;
ALTER TABLE newsletters DROP COLUMN IF EXISTS team_id;

-- Remove columns from newsletter_templates
ALTER TABLE newsletter_templates DROP COLUMN IF EXISTS scope;
ALTER TABLE newsletter_templates DROP COLUMN IF EXISTS team_id;

-- Remove columns from workflow_enrollments
ALTER TABLE workflow_enrollments DROP COLUMN IF EXISTS team_dedup_key;

-- Remove columns from users
ALTER TABLE users DROP COLUMN IF EXISTS team_id;

-- Remove columns from tenants
ALTER TABLE tenants DROP COLUMN IF EXISTS logo_url;
ALTER TABLE tenants DROP COLUMN IF EXISTS brokerage_name;
ALTER TABLE tenants DROP COLUMN IF EXISTS max_members;
ALTER TABLE tenants DROP COLUMN IF EXISTS features;
ALTER TABLE tenants DROP COLUMN IF EXISTS twilio_number;
ALTER TABLE tenants DROP COLUMN IF EXISTS brand_color;

-- Remove columns from tenant_memberships
ALTER TABLE tenant_memberships DROP COLUMN IF EXISTS user_id;

-- Remove columns from team_invites
ALTER TABLE team_invites DROP COLUMN IF EXISTS team_id;
ALTER TABLE team_invites DROP COLUMN IF EXISTS inviter_name;
ALTER TABLE team_invites DROP COLUMN IF EXISTS team_name;
ALTER TABLE team_invites DROP COLUMN IF EXISTS team_logo_url;

-- Drop constraints (ignore errors if they don't exist)
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_visibility_check;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_visibility_check;
ALTER TABLE newsletters DROP CONSTRAINT IF EXISTS newsletters_send_as_check;
ALTER TABLE newsletter_templates DROP CONSTRAINT IF EXISTS newsletter_templates_scope_check;
ALTER TABLE communications DROP CONSTRAINT IF EXISTS communications_visibility_check;
ALTER TABLE tenant_memberships DROP CONSTRAINT IF EXISTS valid_team_roles;

-- Drop indexes
DROP INDEX IF EXISTS idx_users_team_id;
DROP INDEX IF EXISTS idx_memberships_tenant_active;
DROP INDEX IF EXISTS idx_memberships_user_active;
DROP INDEX IF EXISTS idx_memberships_email;
DROP INDEX IF EXISTS idx_memberships_unique_active;
DROP INDEX IF EXISTS idx_invites_token_active;
DROP INDEX IF EXISTS idx_invites_team;
DROP INDEX IF EXISTS idx_contacts_visibility;
DROP INDEX IF EXISTS idx_contacts_assigned;
DROP INDEX IF EXISTS idx_listings_visibility;
DROP INDEX IF EXISTS idx_appointments_assigned;
DROP INDEX IF EXISTS idx_tasks_assigned;
DROP INDEX IF EXISTS idx_newsletters_team_id;
DROP INDEX IF EXISTS idx_newsletter_templates_team_id;
DROP INDEX IF EXISTS idx_workflow_enrollment_dedup;
DROP INDEX IF EXISTS idx_consents_contact;
DROP INDEX IF EXISTS idx_consents_expiry;
DROP INDEX IF EXISTS idx_team_activity_team_time;
DROP INDEX IF EXISTS idx_team_activity_user;
DROP INDEX IF EXISTS idx_audit_team_time;
DROP INDEX IF EXISTS idx_audit_user;

COMMIT;
