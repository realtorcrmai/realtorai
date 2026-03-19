-- Migration 008: Contact Detail Features
-- Adds: lead source, tags, lead status on contacts + contact_documents table

-- Feature 3: Lead Source, Tags, Lead Status on contacts
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new';

-- Feature 5: Contact Documents table
CREATE TABLE IF NOT EXISTS contact_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_documents_contact_id ON contact_documents(contact_id);
ALTER TABLE contact_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated access" ON contact_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon access" ON contact_documents FOR ALL TO anon USING (true) WITH CHECK (true);
