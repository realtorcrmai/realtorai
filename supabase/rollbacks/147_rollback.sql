-- Rollback 147: Restore plaintext-compatible schema for FINTRAC identity tables
--
-- Reverses migration 147 by:
--   1. TRUNCATing both tables (ciphertext cannot be decrypted back into a
--      date column; we cannot preserve the data across the rollback).
--   2. Restoring the `dob` column type from text back to date.
--   3. Dropping the encryption-related column comments.
--
-- Safe for pre-prod only. After go-live, rollback requires a decrypt-and-
-- rewrite script to preserve identity records.

BEGIN;

TRUNCATE TABLE seller_identities CASCADE;
TRUNCATE TABLE buyer_identities CASCADE;

ALTER TABLE seller_identities
  ALTER COLUMN dob TYPE date USING NULL;

ALTER TABLE buyer_identities
  ALTER COLUMN dob TYPE date USING NULL;

COMMENT ON COLUMN seller_identities.id_number IS NULL;
COMMENT ON COLUMN seller_identities.dob IS NULL;
COMMENT ON COLUMN seller_identities.citizenship IS NULL;
COMMENT ON COLUMN seller_identities.mailing_address IS NULL;
COMMENT ON COLUMN buyer_identities.id_number IS NULL;
COMMENT ON COLUMN buyer_identities.dob IS NULL;
COMMENT ON COLUMN buyer_identities.citizenship IS NULL;
COMMENT ON COLUMN buyer_identities.mailing_address IS NULL;

COMMIT;
