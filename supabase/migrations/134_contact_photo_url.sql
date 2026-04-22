-- ============================================================
-- 134: Add photo_url to contacts for profile photos
-- ============================================================

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS photo_url TEXT;
