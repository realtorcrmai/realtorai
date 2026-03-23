-- ============================================================
-- Migration 006: Deals / Pipeline / Commission
-- ============================================================

-- ============================================================
-- TABLE: deals (transactions)
-- ============================================================
CREATE TABLE deals (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id              UUID REFERENCES listings(id) ON DELETE SET NULL,
  contact_id              UUID REFERENCES contacts(id) ON DELETE SET NULL,
  type                    TEXT NOT NULL CHECK (type IN ('buyer', 'seller')),
  stage                   TEXT NOT NULL DEFAULT 'new_lead',
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
  title                   TEXT NOT NULL,
  value                   NUMERIC(14, 2),
  commission_pct          NUMERIC(5, 2),
  commission_amount       NUMERIC(14, 2),
  close_date              DATE,
  possession_date         DATE,
  subject_removal_date    DATE,
  lost_reason             TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: deal_parties (buyer agent, seller agent, lawyer, etc.)
-- ============================================================
CREATE TABLE deal_parties (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id     UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  company     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: deal_checklist (task items for a deal)
-- ============================================================
CREATE TABLE deal_checklist (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id       UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  item          TEXT NOT NULL,
  due_date      DATE,
  completed     BOOLEAN NOT NULL DEFAULT false,
  completed_at  TIMESTAMPTZ,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_type ON deals(type);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_listing_id ON deals(listing_id);
CREATE INDEX idx_deal_parties_deal_id ON deal_parties(deal_id);
CREATE INDEX idx_deal_checklist_deal_id ON deal_checklist(deal_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON deals FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON deal_parties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON deal_checklist FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access" ON deals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON deal_parties FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON deal_checklist FOR ALL USING (auth.role() = 'service_role');

-- Also allow anon role (matching pattern from 003_allow_anon_role)
CREATE POLICY "Allow anon full access" ON deals FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "Allow anon full access" ON deal_parties FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "Allow anon full access" ON deal_checklist FOR ALL USING (auth.role() = 'anon');
