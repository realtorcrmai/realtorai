-- Migration 007: Contact lifecycle enhancements
-- Adds commission tracking to listings, buyer preferences and lifecycle stage to contacts

-- === Listings: commission & buyer tracking ===
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS sold_price NUMERIC,
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closing_date DATE,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC;

-- === Contacts: buyer preferences & lifecycle stage ===
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS buyer_preferences JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'active';
