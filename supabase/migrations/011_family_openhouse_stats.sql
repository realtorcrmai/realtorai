-- ============================================================
-- 011: Contact Family, Important Dates, Open Houses, Listing Activities
-- ============================================================

-- ============================================================
-- TABLE: contact_family_members
-- ============================================================
CREATE TABLE contact_family_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  relationship    TEXT NOT NULL CHECK (relationship IN ('spouse', 'child', 'parent', 'sibling', 'other')),
  phone           TEXT,
  email           TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_family_contact_id ON contact_family_members(contact_id);

-- ============================================================
-- TABLE: contact_important_dates
-- ============================================================
CREATE TABLE contact_important_dates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id          UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  family_member_id    UUID REFERENCES contact_family_members(id) ON DELETE SET NULL,
  date_type           TEXT NOT NULL CHECK (date_type IN ('birthday', 'anniversary', 'closing_anniversary', 'move_in', 'custom')),
  date_value          DATE NOT NULL,
  label               TEXT,
  recurring           BOOLEAN NOT NULL DEFAULT true,
  remind_days_before  INT NOT NULL DEFAULT 7,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_dates_contact_id ON contact_important_dates(contact_id);
CREATE INDEX idx_contact_dates_date_value ON contact_important_dates(date_value);
CREATE INDEX idx_contact_dates_type ON contact_important_dates(date_type);

-- ============================================================
-- TABLE: open_houses
-- ============================================================
CREATE TABLE open_houses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  type            TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'broker', 'private')),
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  visitor_count   INT NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_open_houses_listing_id ON open_houses(listing_id);
CREATE INDEX idx_open_houses_date ON open_houses(date);
CREATE INDEX idx_open_houses_status ON open_houses(status);

CREATE TRIGGER update_open_houses_updated_at BEFORE UPDATE ON open_houses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- TABLE: open_house_visitors
-- ============================================================
CREATE TABLE open_house_visitors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  open_house_id   UUID NOT NULL REFERENCES open_houses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  agent_name      TEXT,
  interest_level  TEXT CHECK (interest_level IN ('hot', 'warm', 'cold')),
  feedback        TEXT,
  wants_followup  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oh_visitors_open_house_id ON open_house_visitors(open_house_id);

-- ============================================================
-- TABLE: listing_activities
-- ============================================================
CREATE TABLE listing_activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id      UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL CHECK (activity_type IN ('view', 'inquiry', 'showing', 'offer', 'price_change', 'open_house')),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  count           INT NOT NULL DEFAULT 1,
  source          TEXT,
  description     TEXT,
  amount          NUMERIC(14,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_activities_listing_id ON listing_activities(listing_id);
CREATE INDEX idx_listing_activities_type ON listing_activities(activity_type);
CREATE INDEX idx_listing_activities_date ON listing_activities(date);

-- ============================================================
-- ROW LEVEL SECURITY (all tables)
-- ============================================================
ALTER TABLE contact_family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access" ON contact_family_members FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "service full access" ON contact_family_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "anon full access" ON contact_family_members FOR ALL USING (auth.role() = 'anon');

ALTER TABLE contact_important_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access" ON contact_important_dates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "service full access" ON contact_important_dates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "anon full access" ON contact_important_dates FOR ALL USING (auth.role() = 'anon');

ALTER TABLE open_houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access" ON open_houses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "service full access" ON open_houses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "anon full access" ON open_houses FOR ALL USING (auth.role() = 'anon');

ALTER TABLE open_house_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access" ON open_house_visitors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "service full access" ON open_house_visitors FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "anon full access" ON open_house_visitors FOR ALL USING (auth.role() = 'anon');

ALTER TABLE listing_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth full access" ON listing_activities FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "service full access" ON listing_activities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "anon full access" ON listing_activities FOR ALL USING (auth.role() = 'anon');
