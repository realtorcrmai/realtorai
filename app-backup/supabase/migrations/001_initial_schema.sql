-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: contacts
-- ============================================================
CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  type          TEXT NOT NULL CHECK (type IN ('buyer', 'seller')),
  pref_channel  TEXT NOT NULL DEFAULT 'sms' CHECK (pref_channel IN ('whatsapp', 'sms')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: listings
-- ============================================================
CREATE TABLE listings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address               TEXT NOT NULL,
  seller_id             UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  lockbox_code          TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'sold')),
  mls_number            TEXT,
  list_price            NUMERIC(12, 2),
  showing_window_start  TIME,
  showing_window_end    TIME,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: appointments (showings)
-- ============================================================
CREATE TABLE appointments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id            UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  start_time            TIMESTAMPTZ NOT NULL,
  end_time              TIMESTAMPTZ NOT NULL,
  status                TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'denied', 'cancelled')),
  buyer_agent_name      TEXT NOT NULL,
  buyer_agent_phone     TEXT NOT NULL,
  buyer_agent_email     TEXT,
  google_event_id       TEXT,
  twilio_message_sid    TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: communications (timeline log)
-- ============================================================
CREATE TABLE communications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel       TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'note')),
  body          TEXT NOT NULL,
  related_id    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: listing_documents (FINTRAC / DORTS / PDS tracker)
-- ============================================================
CREATE TABLE listing_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL CHECK (doc_type IN ('FINTRAC', 'DORTS', 'PDS', 'CONTRACT', 'TITLE', 'OTHER')),
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(listing_id, doc_type)
);

-- ============================================================
-- TABLE: google_tokens (for server-side calendar access)
-- ============================================================
CREATE TABLE google_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email      TEXT NOT NULL UNIQUE,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT NOT NULL,
  expiry_date     BIGINT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_appointments_listing_id ON appointments(listing_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_communications_contact_id ON communications(contact_id);
CREATE INDEX idx_listing_documents_listing_id ON listing_documents(listing_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON contacts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON listings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON appointments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON communications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON listing_documents FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON google_tokens FOR ALL USING (auth.role() = 'authenticated');
