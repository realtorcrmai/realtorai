-- ============================================================
-- 050: Add Property Type Classification to Listings
-- ============================================================

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'Residential'
CHECK (property_type IN ('Residential', 'Condo/Apartment', 'Townhouse', 'Land', 'Commercial', 'Multi-Family'));

-- Create index for filtering by property_type
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings(property_type);
