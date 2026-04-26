-- Rollback 149: Drop mfa_credentials table.
--
-- Safe pre-prod (no enrollments yet). After D2/D3 ship and users start
-- enrolling, this rollback would lock everyone out of MFA-protected
-- accounts and is NOT a recommended path post go-live.

BEGIN;

DROP TRIGGER IF EXISTS trg_mfa_credentials_updated_at ON mfa_credentials;
DROP TABLE IF EXISTS mfa_credentials;

COMMIT;
