-- Rollback: 074_contact_role_system.sql
-- Reverses all changes made by migration 074.
-- Run ONLY if migration 074 needs to be rolled back.
-- WARNING: destroys buyer_journeys, buyer_journey_properties, contact_portfolio data.

-- 1. Drop deferred FKs first
ALTER TABLE buyer_journeys DROP CONSTRAINT IF EXISTS buyer_journeys_linked_portfolio_id_fkey;
ALTER TABLE appointments   DROP COLUMN IF EXISTS journey_property_id;
ALTER TABLE listings       DROP COLUMN IF EXISTS buyer_journey_id;

-- 2. Drop new tables (reverse dependency order)
DROP TABLE IF EXISTS contact_portfolio;
DROP TABLE IF EXISTS buyer_journey_properties;
DROP TABLE IF EXISTS buyer_journeys;

-- 3. Remove columns added to listings and appointments
ALTER TABLE listings     DROP COLUMN IF EXISTS buyer_contact_id;
ALTER TABLE appointments DROP COLUMN IF EXISTS buyer_contact_id;

-- 4. Remove roles column from contacts
DROP INDEX IF EXISTS idx_contacts_roles;
ALTER TABLE contacts DROP COLUMN IF EXISTS roles;

-- 5. Restore lifecycle_stage to original state (migration 009)
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_lifecycle_stage_check;
ALTER TABLE contacts ALTER COLUMN lifecycle_stage SET DEFAULT 'active';
DROP INDEX IF EXISTS idx_contacts_lifecycle;

-- NOTE: Data in lifecycle_stage that was re-seeded by migration 074 is NOT restored.
-- The original values ('active','lead','dormant') are lost — restore from backup if needed.
