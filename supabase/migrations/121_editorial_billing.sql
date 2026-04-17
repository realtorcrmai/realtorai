-- =============================================================================
-- Migration: 121_editorial_billing.sql
-- Description: Add editorial billing tier enforcement fields to the users table.
--              Supports Starter (2 editions/mo free) and Pro ($79/mo unlimited).
-- Created: 2026-04-15
-- =============================================================================

-- ── Tier column ───────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS editorial_tier text NOT NULL DEFAULT 'starter'
    CHECK (editorial_tier IN ('starter', 'pro', 'pro_plus'));

COMMENT ON COLUMN users.editorial_tier IS
  'Editorial newsletter billing tier: starter (2/mo free), pro ($79/mo unlimited), pro_plus (unlimited + priority)';

-- ── Monthly edition counter ───────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS editorial_editions_this_month integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.editorial_editions_this_month IS
  'Rolling count of editorial editions created in the current calendar month. Reset by cron on 1st of each month.';

-- ── Trial window ──────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS editorial_trial_ends_at timestamptz NULL;

COMMENT ON COLUMN users.editorial_trial_ends_at IS
  'When the Pro trial expires. NULL means no active trial.';

-- ── Stripe identifiers ────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id text NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text NULL;

COMMENT ON COLUMN users.stripe_customer_id IS
  'Stripe customer ID for billing management';

COMMENT ON COLUMN users.stripe_subscription_id IS
  'Active Stripe subscription ID. NULL = free tier.';

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_editorial_tier
  ON users (editorial_tier);

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON users (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
