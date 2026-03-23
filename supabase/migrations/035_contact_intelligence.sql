-- Migration 017: Contact Intelligence Graph
-- Adds: households, contact_relationships, demographics, enhanced contact_dates

-- 1. Households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "households_all" ON households FOR ALL USING (true) WITH CHECK (true);

-- 2. Add household_id to contacts (must come after households table)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS demographics JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_contacts_household_id ON contacts(household_id) WHERE household_id IS NOT NULL;

-- 3. Contact relationships table
CREATE TABLE IF NOT EXISTS contact_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_a_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_b_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'spouse', 'parent', 'child', 'sibling', 'friend',
    'colleague', 'neighbour', 'referral', 'other'
  )),
  relationship_label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_relationship UNIQUE (contact_a_id, contact_b_id),
  CONSTRAINT no_self_relationship CHECK (contact_a_id != contact_b_id)
);

ALTER TABLE contact_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_relationships_all" ON contact_relationships FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contact_relationships_a ON contact_relationships(contact_a_id);
CREATE INDEX IF NOT EXISTS idx_contact_relationships_b ON contact_relationships(contact_b_id);

-- 4. Enhance contact_dates with event_type and auto_workflow
ALTER TABLE contact_dates ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'custom';
ALTER TABLE contact_dates ADD COLUMN IF NOT EXISTS auto_workflow BOOLEAN DEFAULT false;
