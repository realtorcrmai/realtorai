-- 084_casl_consent_policy.sql
--
-- CASL (Canada's Anti-Spam Legislation) consent state for pre-existing
-- contacts. This migration addresses a compliance gap surfaced by the
-- 2026-04-09 QA audit.
--
-- Background:
-- - Before 2026-04-09, 6 different email send paths in the codebase
--   checked `newsletter_unsubscribed` inconsistently and NONE checked
--   `casl_consent_given`. The audit found only 27/634 contacts (4.3%)
--   had `casl_consent_given=true`. The other 607 were still receiving
--   commercial email despite having no recorded consent — a CASL
--   violation on every send.
-- - Migration 080 restored the email_verified/phone_verified columns
--   and backfilled them for pre-existing users, but did not touch
--   CASL consent on contacts. That's this migration's job.
-- - Two PR cleanups shipped alongside this migration: a new
--   src/lib/compliance/can-send.ts central guard, and updates to all
--   6 send paths to call it. Both changes ship in the same PR
--   (claude/qa-fixes) so the "enforce consent" and "grant consent to
--   the pre-existing cohort" land atomically.
--
-- Policy decision:
-- The only legally defensible backfill path is "implied consent" under
-- CASL s.10(9)(a)-(d): an existing business relationship within the
-- last 2 years (purchase, lease, contract, enquiry, etc.) implies
-- consent for up to 24 months. That applies to contacts with a
-- recorded transaction or lead activity.
--
-- For Realtors360's current data cohort (mostly demo/seed contacts
-- imported on 2026-04-09), we cannot actually prove a business
-- relationship. But this is DEV data, not real customers — the
-- realistic options are:
--   (a) Backfill consent for all pre-existing contacts with a
--       "synthetic" consent date, noting in the audit trail that it
--       was a dev-data migration and SHOULD be re-collected before
--       real prod launch.
--   (b) Leave all pre-existing contacts blocked (safest, but makes
--       local testing of newsletter flows impossible).
--
-- We go with (a) — synthetic backfill — because this database is
-- explicitly dev-only (see docs/ENVIRONMENTS.md). Before any real
-- production launch, a fresh data migration must either:
--   1. Re-collect explicit consent from each contact, or
--   2. Narrow the backfill to contacts with a documented business
--      relationship (past deals, recorded property viewing,
--      submitted inquiry, etc.)
--
-- The backfill date is set to '2024-04-09' — ONE YEAR before the
-- fictional "today" (2026-04-09) — so the implied 24-month window
-- doesn't expire until 2026-04-09 itself, giving dev enough runway
-- to test and build.
--
-- Idempotent: only touches rows where casl_consent_given is currently
-- NULL or false. Re-running is a no-op after the first apply.

UPDATE contacts
SET
  casl_consent_given = true,
  casl_consent_date = '2024-04-09 00:00:00+00'::timestamptz
WHERE
  (casl_consent_given IS NULL OR casl_consent_given = false)
  AND created_at < now()
  AND newsletter_unsubscribed IS NOT TRUE
  -- Preserve any real opt-outs: don't grant consent to contacts who
  -- have already hit the unsubscribe link.
  AND casl_opt_out_date IS NULL;

-- Audit annotation. Inserted into notes so a realtor/dev can see the
-- synthetic backfill in the contact detail UI.
UPDATE contacts
SET notes = COALESCE(notes || E'\n', '') || '[2026-04-09 DEV BACKFILL] CASL consent granted via migration 084 — synthetic dev-only backfill, must be re-verified before real prod launch.'
WHERE
  casl_consent_given = true
  AND casl_consent_date = '2024-04-09 00:00:00+00'::timestamptz
  AND (notes IS NULL OR notes NOT LIKE '%[2026-04-09 DEV BACKFILL]%');
