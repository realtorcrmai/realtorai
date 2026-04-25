-- Migration 147: Encrypt FINTRAC PII at rest (SOC 2 CC6.1)
--
-- Scope: seller_identities + buyer_identities
-- Fields encrypted: id_number, dob, citizenship, mailing_address
--
-- Design rationale:
--   - dob must change from `date` to `text` because ciphertext ("v1:iv:tag:data")
--     cannot be stored in a date column. We lose DB-level date validation,
--     which is acceptable — validation moves to the Zod layer on the
--     application side before encrypt.
--   - id_number, citizenship, mailing_address are already `text`, no type change needed.
--   - We do NOT encrypt: full_name, phone, email, id_type, id_expiry, occupation.
--     Rationale: those are either (a) operationally needed for search/display
--     (full_name, phone, email), (b) non-sensitive categorical values
--     (id_type), or (c) less-sensitive dates where the value of encryption
--     does not justify the access cost (id_expiry). FINTRAC explicitly flags
--     id_number + dob + citizenship + mailing_address as the sensitive set.
--   - The storage format is `v1:<iv_b64>:<tag_b64>:<ciphertext_b64>` produced
--     by src/lib/crypto.ts using AES-256-GCM. All four fields share the same
--     format; the `v1` prefix reserves a key-version slot for future
--     envelope-encryption migration (Supabase Vault in Week 4).
--
-- PRE-PRODUCTION NOTE:
--   We are NOT live with production data yet (confirmed 2026-04-24). Any
--   existing rows are seed/dev data and MUST be wiped before the schema
--   change — plaintext FINTRAC fields sitting in a text column with no
--   decrypt path would corrupt reads once the application enables encryption.
--   TRUNCATE is safe here; it would be destructive after go-live.
--
--   If this migration is re-applied after go-live, the TRUNCATE must be
--   replaced with a backfill script (encrypt plaintext → write ciphertext).
--   That script is not in scope for v1 — flagged in RISK_REGISTER.md.
--
-- Rollback: supabase/rollbacks/147_rollback.sql (restores `dob` to `date`
-- and truncates again — cannot recover ciphertext as plaintext).

BEGIN;

-- ---------------------------------------------------------------
-- 1. Wipe pre-prod seed data
-- ---------------------------------------------------------------
-- Any row currently in these tables was created before encryption was
-- enforced. Decrypting plaintext would fail; leaving plaintext would leak.
-- Truncate and let QA re-seed through the encrypted write path.
TRUNCATE TABLE seller_identities CASCADE;
TRUNCATE TABLE buyer_identities CASCADE;

-- ---------------------------------------------------------------
-- 2. Change dob column from `date` to `text` to hold ciphertext
-- ---------------------------------------------------------------
ALTER TABLE seller_identities
  ALTER COLUMN dob DROP DEFAULT,
  ALTER COLUMN dob TYPE text USING NULL;

ALTER TABLE buyer_identities
  ALTER COLUMN dob DROP DEFAULT,
  ALTER COLUMN dob TYPE text USING NULL;

-- ---------------------------------------------------------------
-- 3. Document encrypted columns
-- ---------------------------------------------------------------
-- Anyone reading the schema (dev, auditor, DBA) sees encryption status
-- without needing to find the application-layer definition.

COMMENT ON COLUMN seller_identities.id_number IS
  'FINTRAC PII — AES-256-GCM encrypted at rest. Format: v1:iv_b64:tag_b64:ct_b64. See src/lib/crypto.ts. NEVER read with raw SQL for display — route through decryptFields().';
COMMENT ON COLUMN seller_identities.dob IS
  'FINTRAC PII — AES-256-GCM encrypted at rest. Type is text (not date) to hold ciphertext. Validated as ISO date in Zod before encrypt. See src/lib/crypto.ts.';
COMMENT ON COLUMN seller_identities.citizenship IS
  'FINTRAC PII — AES-256-GCM encrypted at rest. See src/lib/crypto.ts.';
COMMENT ON COLUMN seller_identities.mailing_address IS
  'FINTRAC PII — AES-256-GCM encrypted at rest. See src/lib/crypto.ts.';

COMMENT ON COLUMN buyer_identities.id_number IS
  'FINTRAC PII — AES-256-GCM encrypted at rest. Format: v1:iv_b64:tag_b64:ct_b64. See src/lib/crypto.ts.';
COMMENT ON COLUMN buyer_identities.dob IS
  'FINTRAC PII — AES-256-GCM encrypted at rest. Type is text (not date) to hold ciphertext. Validated as ISO date in Zod before encrypt.';
COMMENT ON COLUMN buyer_identities.citizenship IS
  'FINTRAC PII — AES-256-GCM encrypted at rest.';
COMMENT ON COLUMN buyer_identities.mailing_address IS
  'FINTRAC PII — AES-256-GCM encrypted at rest.';

-- ---------------------------------------------------------------
-- 4. Sanity check — intentionally no CHECK constraint on ciphertext format
-- ---------------------------------------------------------------
-- A CHECK LIKE 'v_:%:%:%' would reject NULL / empty-string pass-through
-- (src/lib/crypto.ts returns plaintext unchanged for empty inputs, so
-- empty columns must still be writable). We rely on isEncrypted() in
-- decryptFields() to distinguish plaintext/ciphertext during reads.

COMMIT;
