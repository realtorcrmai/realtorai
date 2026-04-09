-- ============================================================
-- Migration 076: Property Co-Ownership & Partner Network
-- ============================================================

-- Add indirect contact fields to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS is_indirect BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS indirect_source TEXT; -- 'property_partner'

-- Property deals table
CREATE TABLE IF NOT EXISTS property_deals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id   UUID NOT NULL,
  address      TEXT NOT NULL,
  property_type TEXT DEFAULT 'residential',
  listing_id   UUID REFERENCES listings(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Partners junction table
CREATE TABLE IF NOT EXISTS property_deal_partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL REFERENCES property_deals(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'co-owner',
  ownership_pct NUMERIC(5,2),
  is_primary    BOOLEAN DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (deal_id, contact_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_deals_realtor ON property_deals(realtor_id);
CREATE INDEX IF NOT EXISTS idx_property_deal_partners_deal ON property_deal_partners(deal_id);
CREATE INDEX IF NOT EXISTS idx_property_deal_partners_contact ON property_deal_partners(contact_id);

-- RLS
ALTER TABLE property_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_deal_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "realtor_owns_deals" ON property_deals
  FOR ALL USING (realtor_id = auth.uid());

CREATE POLICY "realtor_owns_deal_partners" ON property_deal_partners
  FOR ALL USING (
    deal_id IN (SELECT id FROM property_deals WHERE realtor_id = auth.uid())
  );
