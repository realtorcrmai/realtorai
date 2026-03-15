-- ============================================================
-- TABLE: mortgages (buyer mortgage tracking for renewal alerts)
-- ============================================================
CREATE TABLE mortgages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lender_name     TEXT NOT NULL,
  mortgage_amount NUMERIC(14,2),
  interest_rate   NUMERIC(5,3),
  mortgage_type   TEXT NOT NULL DEFAULT 'fixed' CHECK (mortgage_type IN ('fixed', 'variable', 'arm')),
  term_months     INT,
  amortization_years INT,
  start_date      DATE,
  renewal_date    DATE,
  monthly_payment NUMERIC(10,2),
  lender_contact  TEXT,
  lender_phone    TEXT,
  lender_email    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_mortgages_deal_id ON mortgages(deal_id);
CREATE INDEX idx_mortgages_contact_id ON mortgages(contact_id);
CREATE INDEX idx_mortgages_renewal_date ON mortgages(renewal_date);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE TRIGGER update_mortgages_updated_at BEFORE UPDATE ON mortgages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE mortgages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON mortgages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Service role full access" ON mortgages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anon role full access" ON mortgages FOR ALL USING (auth.role() = 'anon');
