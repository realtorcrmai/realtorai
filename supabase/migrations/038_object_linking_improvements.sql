-- ============================================================
-- Migration 018: Object Linking Improvements
-- P0-4: Add buyer_agent_contact_id FK to appointments
-- P0-6: Add deal_id to communications for deal-level messaging
-- Also: Add contact_id to open_house_visitors
-- ============================================================

-- ── P0-4: Link buyer agents to contacts ──────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS buyer_agent_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_buyer_agent_contact_id
  ON appointments(buyer_agent_contact_id);

COMMENT ON COLUMN appointments.buyer_agent_contact_id IS
  'Optional FK to contacts table for buyer agent. When set, buyer_agent_name/phone/email are denormalized copies.';

-- ── P0-6: Link communications to deals ───────────────────────
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_communications_deal_id
  ON communications(deal_id);

COMMENT ON COLUMN communications.deal_id IS
  'Optional FK to deals table. When set, this communication is associated with a specific deal.';

-- ── P1: Link open house visitors to contacts ─────────────────
ALTER TABLE open_house_visitors
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oh_visitors_contact_id
  ON open_house_visitors(contact_id);

COMMENT ON COLUMN open_house_visitors.contact_id IS
  'Optional FK to contacts table. Links a visitor to an existing contact for lead tracking.';
