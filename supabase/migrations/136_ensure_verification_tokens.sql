-- 136: Ensure verification_tokens table exists with correct schema
-- This table was created directly in the Supabase SQL editor and never had a migration.
-- Code references: signup, resend-verify, verify-email, verify-phone

CREATE TABLE IF NOT EXISTS verification_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('email', 'phone')),
  token_hash text NOT NULL,
  identifier text,  -- used for phone verification (e164 number)
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_type
  ON verification_tokens(user_id, type);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires
  ON verification_tokens(expires_at);

-- RLS: service-role only (admin client)
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role access" ON verification_tokens;
CREATE POLICY "Service role access" ON verification_tokens
  FOR ALL USING (true);

-- Clean up expired tokens (older than 1 hour) to prevent table bloat
DELETE FROM verification_tokens WHERE expires_at < now() - interval '1 hour';
