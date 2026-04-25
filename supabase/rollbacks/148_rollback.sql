-- Rollback 148: Remove encryption documentation from google_tokens.
--
-- Note: ciphertext rows remain encrypted after rollback — the column
-- type and data are unchanged. Callers that read these rows without
-- going through src/lib/google-tokens.ts will see literal strings of
-- the form `v1:...` rather than usable tokens. To fully revert data,
-- either (a) wait for refresh rotation, or (b) delete affected rows
-- and re-link the Google account.

BEGIN;

COMMENT ON COLUMN google_tokens.access_token IS NULL;
COMMENT ON COLUMN google_tokens.refresh_token IS NULL;

COMMIT;
