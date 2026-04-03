-- 073: Add soft delete support to contacts, listings, tasks
-- Instead of permanent deletion, set deleted_at timestamp.
-- All queries should filter WHERE deleted_at IS NULL.

-- Contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts (deleted_at) WHERE deleted_at IS NULL;

-- Listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_deleted_at ON listings (deleted_at) WHERE deleted_at IS NULL;

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at) WHERE deleted_at IS NULL;
