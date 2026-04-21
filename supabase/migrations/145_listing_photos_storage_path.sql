-- Migration 145: Add storage_path column to listing_photos for deletion tracking
-- Safe: IF NOT EXISTS prevents re-run errors

ALTER TABLE listing_photos ADD COLUMN IF NOT EXISTS storage_path TEXT;

COMMENT ON COLUMN listing_photos.storage_path IS 'Supabase storage path for cleanup on deletion';
