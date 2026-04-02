-- Migration 071: Add plan column to users table
-- Part of simplified feature gating architecture

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

-- Existing users get 'professional' (they were on full CRM before plans existed)
UPDATE users SET plan = 'professional' WHERE plan = 'free' AND role = 'realtor';

-- Admin users get 'admin'
UPDATE users SET plan = 'admin' WHERE role = 'admin';

-- Index for plan queries
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
