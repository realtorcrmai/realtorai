-- Migration 142: Buyer identity verification (FINTRAC Part XV.1)
-- Mirrors seller_identities structure for buyer KYC compliance.
-- Required when listing transitions to pending/sold with a buyer_id.

CREATE TABLE IF NOT EXISTS buyer_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  dob DATE,
  citizenship TEXT DEFAULT 'canadian',
  id_type TEXT DEFAULT 'drivers_license',
  id_number TEXT,
  id_expiry DATE,
  phone TEXT,
  email TEXT,
  mailing_address TEXT,
  occupation TEXT,
  sort_order INTEGER DEFAULT 0,
  realtor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_buyer_identities_listing ON buyer_identities (listing_id);
CREATE INDEX IF NOT EXISTS idx_buyer_identities_realtor ON buyer_identities (realtor_id);

-- RLS
ALTER TABLE buyer_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY buyer_identities_tenant_policy ON buyer_identities
  FOR ALL USING (true);

COMMENT ON TABLE buyer_identities IS 'FINTRAC Part XV.1 identity verification for buyers in a transaction';
