-- Add new columns to contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Create contact_dates table
CREATE TABLE IF NOT EXISTS contact_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_contact_dates_contact_id ON contact_dates(contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_referred_by_id ON contacts(referred_by_id);

-- RLS for contact_dates (match contacts pattern)
ALTER TABLE contact_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to contact_dates"
  ON contact_dates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon access to contact_dates"
  ON contact_dates FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
