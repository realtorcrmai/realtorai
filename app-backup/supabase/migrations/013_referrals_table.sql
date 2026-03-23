-- ============================================================
-- 013 — Referrals tracking table
-- ============================================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_by_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referred_client_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referral_type TEXT CHECK (referral_type IN ('buyer', 'seller', 'rental', 'other')) DEFAULT 'buyer',
  referral_date DATE DEFAULT CURRENT_DATE,
  referral_fee_percent NUMERIC(5,2),
  status TEXT CHECK (status IN ('open', 'accepted', 'closed', 'lost')) DEFAULT 'open',
  closed_deal_id UUID REFERENCES listings(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated + anon (admin client) full access (single-tenant)
CREATE POLICY "Allow all access" ON referrals FOR ALL USING (true) WITH CHECK (true);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by ON referrals(referred_by_contact_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_client ON referrals(referred_client_contact_id);

-- Backfill: create referral records for existing contacts that have referred_by_id set
INSERT INTO referrals (referred_by_contact_id, referred_client_contact_id, referral_type, status)
SELECT
  c.referred_by_id,
  c.id,
  c.type,  -- buyer or seller
  CASE
    WHEN c.lead_status = 'closed' THEN 'closed'
    WHEN c.lead_status IN ('active', 'under_contract', 'qualified') THEN 'accepted'
    ELSE 'open'
  END
FROM contacts c
WHERE c.referred_by_id IS NOT NULL
ON CONFLICT DO NOTHING;
