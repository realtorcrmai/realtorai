-- 080_restore_stripped_columns.sql
--
-- Restore columns that were present in the pre-consolidation ybgilju
-- project but not in the target qcohfoh project, causing silent runtime
-- errors in the Next.js app:
--
--   [auth] Error fetching user: column users.email_verified does not exist
--   [auth] Error inserting user: duplicate key value violates unique
--          constraint "users_email_key"
--
-- Background: during the 2026-04-09 Supabase consolidation, the import
-- script used column-intersection to strip columns that existed in the
-- source (ybgilju) but not in the target (qcohfoh). This allowed the
-- data migration to succeed but left the app in a broken state whenever
-- it tried to read or write the stripped columns. Column types,
-- nullability, and defaults below are copied byte-for-byte from ybgilju's
-- pg_catalog as observed on 2026-04-09.
--
-- All columns use IF NOT EXISTS so this migration is idempotent. None
-- of them are dropped from qcohfoh, so re-running is a no-op after the
-- first application.
--
-- NOT NULL columns are added WITHOUT a NOT NULL constraint at first, so
-- existing rows get NULL. Then a backfill UPDATE sets them to the
-- default value, then NOT NULL is added. This three-step pattern avoids
-- breaking tables with existing data.

-- =============================================================================
-- users
-- =============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source text DEFAULT 'google'::text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS brokerage text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number text;

-- email_verified was NOT NULL in ybgilju with default false.
-- Add as nullable first, backfill, then enforce NOT NULL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
UPDATE users SET email_verified = false WHERE email_verified IS NULL;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

-- =============================================================================
-- listings — restore all 26 stripped columns
-- =============================================================================

-- Nullable columns (safe to add without backfill)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS prop_unit text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS prop_type text DEFAULT 'detached'::text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS showing_instructions text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS list_duration integer DEFAULT 90;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS commission_seller numeric DEFAULT 3.222;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS commission_buyer numeric DEFAULT 2.500;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS possession_date date;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_locked boolean DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS marketing_tier text DEFAULT 'standard'::text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS suggested_price numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS cma_low numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS cma_high numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS cma_notes text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS mls_remarks text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS mls_realtor_remarks text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS mls_status text DEFAULT 'pending'::text;

-- NOT NULL columns: add nullable, backfill, enforce
-- current_phase: default 1 (FINTRAC intake)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS current_phase integer DEFAULT 1;
UPDATE listings SET current_phase = 1 WHERE current_phase IS NULL;
ALTER TABLE listings ALTER COLUMN current_phase SET NOT NULL;

-- audit_trail: empty JSONB array
ALTER TABLE listings ADD COLUMN IF NOT EXISTS audit_trail jsonb DEFAULT '[]'::jsonb;
UPDATE listings SET audit_trail = '[]'::jsonb WHERE audit_trail IS NULL;
ALTER TABLE listings ALTER COLUMN audit_trail SET NOT NULL;

-- disclosures: empty JSONB object
ALTER TABLE listings ADD COLUMN IF NOT EXISTS disclosures jsonb DEFAULT '{}'::jsonb;
UPDATE listings SET disclosures = '{}'::jsonb WHERE disclosures IS NULL;
ALTER TABLE listings ALTER COLUMN disclosures SET NOT NULL;

-- inclusions, exclusions, rental_equipment, mls_photos: empty text[]
ALTER TABLE listings ADD COLUMN IF NOT EXISTS inclusions text[] DEFAULT '{}'::text[];
UPDATE listings SET inclusions = '{}'::text[] WHERE inclusions IS NULL;
ALTER TABLE listings ALTER COLUMN inclusions SET NOT NULL;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS exclusions text[] DEFAULT '{}'::text[];
UPDATE listings SET exclusions = '{}'::text[] WHERE exclusions IS NULL;
ALTER TABLE listings ALTER COLUMN exclusions SET NOT NULL;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS rental_equipment text[] DEFAULT '{}'::text[];
UPDATE listings SET rental_equipment = '{}'::text[] WHERE rental_equipment IS NULL;
ALTER TABLE listings ALTER COLUMN rental_equipment SET NOT NULL;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS mls_photos text[] DEFAULT '{}'::text[];
UPDATE listings SET mls_photos = '{}'::text[] WHERE mls_photos IS NULL;
ALTER TABLE listings ALTER COLUMN mls_photos SET NOT NULL;

-- stakeholders: pre-seeded JSONB structure
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stakeholders jsonb DEFAULT '{"lawyer": {}, "lender": {}, "buyerAgent": {}}'::jsonb;
UPDATE listings SET stakeholders = '{"lawyer": {}, "lender": {}, "buyerAgent": {}}'::jsonb WHERE stakeholders IS NULL;
ALTER TABLE listings ALTER COLUMN stakeholders SET NOT NULL;

-- forms_status: empty JSONB object (BCREA form state)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS forms_status jsonb DEFAULT '{}'::jsonb;
UPDATE listings SET forms_status = '{}'::jsonb WHERE forms_status IS NULL;
ALTER TABLE listings ALTER COLUMN forms_status SET NOT NULL;

-- envelopes: pre-seeded DocuSign envelope tracker
ALTER TABLE listings ADD COLUMN IF NOT EXISTS envelopes jsonb DEFAULT '{"agent_pkg": {"id": "", "status": "none"}, "seller_pkg": {"id": "", "status": "none"}}'::jsonb;
UPDATE listings SET envelopes = '{"agent_pkg": {"id": "", "status": "none"}, "seller_pkg": {"id": "", "status": "none"}}'::jsonb WHERE envelopes IS NULL;
ALTER TABLE listings ALTER COLUMN envelopes SET NOT NULL;

-- =============================================================================
-- Verification — count columns restored
-- =============================================================================
-- Intended to be read, not executed as part of the migration. Run manually
-- after applying to confirm:
--
--   SELECT count(*) FROM information_schema.columns
--   WHERE table_name = 'users'
--     AND column_name IN ('password_hash','email_verified','signup_source',
--                         'phone','brokerage','license_number');
--   -- expect: 6
--
--   SELECT count(*) FROM information_schema.columns
--   WHERE table_name = 'listings'
--     AND column_name IN ('current_phase','audit_trail','prop_unit','prop_type',
--                         'disclosures','inclusions','exclusions','rental_equipment',
--                         'showing_instructions','list_duration','commission_seller',
--                         'commission_buyer','possession_date','price_locked',
--                         'marketing_tier','suggested_price','cma_low','cma_high',
--                         'cma_notes','stakeholders','forms_status','envelopes',
--                         'mls_remarks','mls_realtor_remarks','mls_photos','mls_status');
--   -- expect: 26
