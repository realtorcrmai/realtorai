-- ============================================================
-- 133: Listing Photos — multi-photo gallery per listing
-- ============================================================

CREATE TABLE IF NOT EXISTS listing_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  realtor_id  UUID NOT NULL REFERENCES users(id),
  photo_url   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'gallery'
              CHECK (role IN ('exterior', 'living', 'kitchen', 'bedroom', 'bathroom', 'outdoor', 'gallery')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  caption     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_id ON listing_photos(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_photos_realtor_id ON listing_photos(realtor_id);

-- RLS
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_photos_all ON listing_photos FOR ALL USING (true);
