-- Migration 149: MFA credentials storage (SOC 2 CC6.1 + CC6.6)
--
-- Day-0 blocker per SOC 2 v2 plan. This migration creates the schema
-- only — it does NOT enroll any user, generate any secret, or modify
-- the auth flow. The TOTP library and enrollment endpoints come in a
-- follow-up scope (D2). Wiring into NextAuth is D3.
--
-- Why ship the schema before the implementation?
--   1. Auditor evidence: SOC 2 reviewers want to see the data model
--      that holds the second factor. A schema with encryption notes
--      and RLS demonstrates intent and design even if the feature is
--      not yet user-facing.
--   2. Migration ordering: putting the table in early avoids race
--      conditions when D2/D3 land. Running 149 against an empty table
--      is safer than running it against a populated one.
--
-- Storage model:
--   1 row per user, PK = user_id (denormalized — fast lookup on every
--   verify without a JOIN). enrolled_at = NULL means the secret was
--   generated but never confirmed (a stale enrollment in flight).
--   disabled_at != NULL = MFA explicitly turned off; row kept for
--   audit, NOT deleted, so PII_DELETED event isn't required.
--
-- Encryption:
--   - totp_secret stored as ciphertext using AES-256-GCM via
--     src/lib/crypto.ts. Format: v1:iv_b64:tag_b64:ct_b64.
--   - backup_codes is a JSONB array of ciphertext strings, one per
--     code. Each code is encrypted independently so revoking one does
--     not require re-encrypting the rest.
--   - Plaintext NEVER hits the DB. No bridge needed — table is empty.

BEGIN;

-- ---------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mfa_credentials (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  totp_secret    TEXT NOT NULL,
  backup_codes   JSONB NOT NULL DEFAULT '[]'::jsonb,
  enrolled_at    TIMESTAMPTZ,
  last_used_at   TIMESTAMPTZ,
  disabled_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Sanity: backup_codes must be a JSON array (even if empty) so callers
  -- can rely on .length without a type check.
  CONSTRAINT mfa_credentials_backup_codes_is_array
    CHECK (jsonb_typeof(backup_codes) = 'array')
);

-- ---------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------
-- Reuses set_updated_at() from migration 074 / 078.
DROP TRIGGER IF EXISTS trg_mfa_credentials_updated_at ON mfa_credentials;
CREATE TRIGGER trg_mfa_credentials_updated_at
  BEFORE UPDATE ON mfa_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------
-- A user can only see and modify their own MFA row. Admin operations
-- (forced reset, support disable) go through service_role which
-- bypasses RLS — those paths MUST log MFA_DISABLED audit events.

ALTER TABLE mfa_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mfa_credentials_self ON mfa_credentials;
CREATE POLICY mfa_credentials_self ON mfa_credentials
  FOR ALL
  USING (user_id = auth.uid()::uuid)
  WITH CHECK (user_id = auth.uid()::uuid);

-- ---------------------------------------------------------------
-- 4. Documentation (column comments — encryption posture for auditors)
-- ---------------------------------------------------------------
COMMENT ON TABLE mfa_credentials IS
  'Per-user TOTP + backup-code storage. PK = user_id, one row per user. SOC 2 CC6.6.';
COMMENT ON COLUMN mfa_credentials.totp_secret IS
  'TOTP shared secret — AES-256-GCM encrypted at rest (src/lib/crypto.ts). NEVER read with raw SQL; route through the MFA service to decrypt.';
COMMENT ON COLUMN mfa_credentials.backup_codes IS
  'JSONB array of independently-encrypted recovery codes. Each element is a v1:iv:tag:ct string. Codes are single-use — consumed by replacing with NULL or removing from the array.';
COMMENT ON COLUMN mfa_credentials.enrolled_at IS
  'NULL until the user completes the verification step on enrollment. Rows with NULL enrolled_at are stale and may be cleaned up after 15 minutes by a separate sweeper.';
COMMENT ON COLUMN mfa_credentials.disabled_at IS
  'NULL = MFA active. Set when user turns off MFA or admin force-disables. Row is retained (not deleted) for audit history.';

COMMIT;
