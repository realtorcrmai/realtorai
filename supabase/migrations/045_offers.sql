-- ============================================================
-- MIGRATION 022: Offer Management System
-- Offers, conditions, and history tracking
-- ============================================================

-- ── 1. Offers table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  seller_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Financials
  offer_amount      NUMERIC(12, 2) NOT NULL,
  earnest_money     NUMERIC(12, 2),
  down_payment      NUMERIC(12, 2),

  -- Status
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'countered', 'accepted',
    'rejected', 'withdrawn', 'expired', 'cancelled'
  )),
  is_counter_offer  BOOLEAN DEFAULT false,
  parent_offer_id   UUID REFERENCES offers(id) ON DELETE SET NULL,

  -- Dates
  submitted_at      TIMESTAMPTZ,
  expiry_date       TIMESTAMPTZ,
  closing_date      DATE,
  possession_date   DATE,

  -- Details
  financing_type    TEXT CHECK (financing_type IS NULL OR financing_type IN (
    'conventional', 'cash', 'fha', 'va', 'seller_financing', 'other'
  )),
  notes             TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_listing ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_contact_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_contact_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_parent ON offers(parent_offer_id) WHERE parent_offer_id IS NOT NULL;

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_all" ON offers FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── 2. Offer conditions (subjects/contingencies) ────────────
CREATE TABLE IF NOT EXISTS offer_conditions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  condition_type  TEXT NOT NULL CHECK (condition_type IN (
    'financing', 'inspection', 'appraisal', 'title_search',
    'sale_of_buyers_home', 'insurance', 'strata_documents',
    'property_disclosure', 'fintrac', 'other'
  )),
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'satisfied', 'waived', 'failed'
  )),
  due_date        DATE,
  satisfied_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_conditions_offer ON offer_conditions(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_conditions_status ON offer_conditions(status);
CREATE INDEX IF NOT EXISTS idx_offer_conditions_due ON offer_conditions(due_date) WHERE status = 'pending';

ALTER TABLE offer_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_conditions_all" ON offer_conditions FOR ALL USING (true) WITH CHECK (true);

-- ── 3. Offer history (audit trail) ──────────────────────────
CREATE TABLE IF NOT EXISTS offer_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN (
    'created', 'submitted', 'countered', 'accepted',
    'rejected', 'withdrawn', 'expired', 'cancelled',
    'condition_added', 'condition_satisfied', 'condition_waived',
    'condition_failed', 'note_added', 'price_changed'
  )),
  from_status     TEXT,
  to_status       TEXT,
  description     TEXT,
  performed_by    TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_history_offer ON offer_history(offer_id, created_at DESC);

ALTER TABLE offer_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_history_all" ON offer_history FOR ALL USING (true) WITH CHECK (true);

-- ── 4. Enable realtime for offers ───────────────────────────
-- (Will work once realtime is enabled in Supabase dashboard)
-- ALTER PUBLICATION supabase_realtime ADD TABLE offers;
-- ALTER PUBLICATION supabase_realtime ADD TABLE offer_conditions;
