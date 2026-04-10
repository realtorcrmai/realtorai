-- 095: Onboarding Overhaul
-- Trial system, personalization columns, onboarding checklist, team invites, lead forwarding
-- Reference: docs/gap-analysis/onboarding/v3_2026-04-10.md

BEGIN;

-- ============================================================
-- 1. Users table — trial + personalization columns
-- ============================================================

-- Trial system (S7)
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_plan TEXT DEFAULT 'professional';

-- Personalization wizard data (P1-P10)
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_persona TEXT DEFAULT 'solo_agent';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_market TEXT DEFAULT 'residential';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_focus JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_team_size TEXT DEFAULT 'just_me';
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_experience TEXT DEFAULT 'new';
ALTER TABLE users ADD COLUMN IF NOT EXISTS personalization_completed BOOLEAN NOT NULL DEFAULT false;

-- Dashboard preset (O12)
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preset TEXT DEFAULT 'full_crm';

-- AI briefing cache (A3)
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_briefing JSONB;

-- Drip unsubscribe flag (D6)
ALTER TABLE users ADD COLUMN IF NOT EXISTS drip_unsubscribed BOOLEAN NOT NULL DEFAULT false;

-- Twilio number (I5)
ALTER TABLE users ADD COLUMN IF NOT EXISTS twilio_number TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_trial ON users(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_personalization ON users(personalization_completed) WHERE personalization_completed = false;
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed) WHERE onboarding_completed = false;

-- ============================================================
-- 2. Onboarding checklist (PO1) — server-backed progress tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, item_key)
);

ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checklist" ON onboarding_checklist FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_checklist_user ON onboarding_checklist(user_id);

-- ============================================================
-- 3. Team invites (O13, O14)
-- ============================================================

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'accepted', 'expired')),
  role TEXT NOT NULL DEFAULT 'agent'
    CHECK (role IN ('agent', 'assistant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own invites" ON team_invites FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_invites_token ON team_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON team_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON team_invites(status) WHERE status = 'pending';

-- ============================================================
-- 4. Lead forwarding addresses (I3)
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_forwarding_addresses (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lead_forwarding_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own forwarding" ON lead_forwarding_addresses FOR ALL USING (true);

COMMIT;
