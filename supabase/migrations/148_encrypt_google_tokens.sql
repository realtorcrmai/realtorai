-- Migration 148: Encrypt Google OAuth tokens at rest (SOC 2 CC6.1)
--
-- Scope: google_tokens.access_token + google_tokens.refresh_token
-- Format: v1:<iv_b64>:<tag_b64>:<ciphertext_b64> (AES-256-GCM)
-- Helper: src/lib/google-tokens.ts wraps src/lib/crypto.ts
--
-- NO schema change, NO truncate.
--
--   - Columns are already TEXT; ciphertext fits.
--   - Existing rows stay as plaintext during the bridge period. The
--     decrypt helper (decryptFields in src/lib/crypto.ts) detects the
--     `v1:...` prefix via isEncrypted() and passes plaintext through
--     untouched. The first refresh_token rotation re-writes the row
--     as ciphertext, so the bridge closes naturally without forcing
--     users to re-link their Google accounts.
--
--   - If we truncated google_tokens on this migration, every user with
--     a linked Google account would silently lose calendar sync until
--     they went through OAuth again. Not acceptable even pre-prod —
--     the acceptance tests depend on seeded tokens working.
--
-- Rollback: 148_rollback.sql drops the comments. Ciphertext rows stay
-- encrypted on rollback — caller must decrypt explicitly or re-link.

BEGIN;

COMMENT ON COLUMN google_tokens.access_token IS
  'Google OAuth access token — AES-256-GCM encrypted at rest. Format: v1:iv_b64:tag_b64:ct_b64. Read/write only via src/lib/google-tokens.ts helpers. Legacy plaintext rows tolerated during bridge (isEncrypted() gate).';
COMMENT ON COLUMN google_tokens.refresh_token IS
  'Google OAuth refresh token — AES-256-GCM encrypted at rest. Same format and access rules as access_token. Plaintext bridge closes on next token rotation.';

COMMIT;
