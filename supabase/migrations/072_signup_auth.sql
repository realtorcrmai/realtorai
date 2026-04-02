-- Migration 072: Self-service signup support
-- Adds password_hash for email/password auth and email_verified flag

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source text DEFAULT 'google'; -- google, email, demo
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS brokerage text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number text;

CREATE INDEX IF NOT EXISTS idx_users_signup ON users(signup_source);
