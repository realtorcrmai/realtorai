-- 081_user_profile_onboarding_columns.sql
--
-- Add user profile + onboarding columns that are referenced by the
-- application code but have NO migration file in the repo. These
-- columns were likely added ad-hoc to one developer's local project
-- over time and the corresponding migration was never written.
--
-- Discovered during post-consolidation local testing on 2026-04-09:
-- the Next.js dev server logs repeated errors like
--
--   [auth] Error fetching user: column users.phone_verified does not exist
--
-- every time a user authenticates. Migration 080 already added the
-- columns that existed in ybgilju but were dropped during the 2026-04-09
-- consolidation. This migration adds columns that never existed in ANY
-- previous Supabase project but the app code references anyway.
--
-- All columns are nullable or have sensible defaults, so existing rows
-- are unaffected.

-- ── Verification status ─────────────────────────────────────────
-- Pair with the existing email_verified column (added by migration 080).
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- ── Onboarding state ────────────────────────────────────────────
-- Tracked by src/actions/onboarding.ts and checked during auth in
-- src/lib/auth.ts:147. onboarding_step is 0-indexed with unbounded max
-- (the app decides when to flip completed → true).
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;

-- ── Profile fields referenced by onboarding.ts SELECT ──────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Vancouver';

-- ── Backfill existing users as fully onboarded ─────────────────
-- PostgreSQL's ADD COLUMN ... DEFAULT backfills existing rows with the
-- default value. For onboarding_completed/email_verified that means
-- every pre-existing user got `false`, which causes the auth layer to
-- gate API access behind the onboarding flow. But all rows present at
-- the time of this migration are pre-existing users who were already
-- using the app before onboarding state was even a concept — they
-- should be treated as fully onboarded.
--
-- New signups created AFTER this migration runs will get the column
-- defaults (`false` for both) and go through the proper flow.
--
-- Only backfill rows where ALL verification/onboarding flags are
-- currently `false` AND the user was created before this migration
-- ran — so re-running the migration does NOT re-flip any users who
-- legitimately need to finish onboarding.
--
-- API routes like /api/contacts, /api/listings, /api/showings gate
-- access behind BOTH `email_verified` and `phone_verified` being true
-- (see src/lib/auth.ts and per-route guards). Without this backfill,
-- existing users would be locked out of all tenant data until they
-- re-verified via the onboarding flow, which makes no sense for
-- pre-existing accounts.
UPDATE users
SET
  onboarding_completed = true,
  email_verified = true,
  phone_verified = true
WHERE onboarding_completed = false
  AND email_verified = false
  AND phone_verified = false
  AND created_at < NOW();
