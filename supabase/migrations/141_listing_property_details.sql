-- Migration 141: Add physical property detail columns to listings
-- These are the most-queried fields for real estate search/filter/MLS input.
-- Stored as real columns (not JSONB) for indexing and type safety.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS bedrooms       SMALLINT,
  ADD COLUMN IF NOT EXISTS bathrooms      NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS total_sqft     INTEGER,
  ADD COLUMN IF NOT EXISTS finished_sqft  INTEGER,
  ADD COLUMN IF NOT EXISTS lot_sqft       INTEGER,
  ADD COLUMN IF NOT EXISTS year_built     SMALLINT,
  ADD COLUMN IF NOT EXISTS parking_spaces SMALLINT,
  ADD COLUMN IF NOT EXISTS stories        SMALLINT,
  ADD COLUMN IF NOT EXISTS basement_type  TEXT,
  ADD COLUMN IF NOT EXISTS heating_type   TEXT,
  ADD COLUMN IF NOT EXISTS cooling_type   TEXT,
  ADD COLUMN IF NOT EXISTS roof_type      TEXT,
  ADD COLUMN IF NOT EXISTS exterior_type  TEXT,
  ADD COLUMN IF NOT EXISTS flooring       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS features       TEXT[] DEFAULT '{}';

-- Indexes for common search/filter queries
CREATE INDEX IF NOT EXISTS idx_listings_bedrooms ON listings (bedrooms) WHERE bedrooms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_bathrooms ON listings (bathrooms) WHERE bathrooms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_total_sqft ON listings (total_sqft) WHERE total_sqft IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_year_built ON listings (year_built) WHERE year_built IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_lot_sqft ON listings (lot_sqft) WHERE lot_sqft IS NOT NULL;

-- Composite index for common multi-filter search: bedrooms + price
CREATE INDEX IF NOT EXISTS idx_listings_bed_price ON listings (bedrooms, list_price) WHERE bedrooms IS NOT NULL AND list_price IS NOT NULL;

COMMENT ON COLUMN listings.bedrooms IS 'Number of bedrooms';
COMMENT ON COLUMN listings.bathrooms IS 'Number of bathrooms (2.5 = 2 full + 1 half)';
COMMENT ON COLUMN listings.total_sqft IS 'Total square footage (all levels)';
COMMENT ON COLUMN listings.finished_sqft IS 'Finished/livable square footage';
COMMENT ON COLUMN listings.lot_sqft IS 'Lot size in square feet';
COMMENT ON COLUMN listings.year_built IS 'Year property was built';
COMMENT ON COLUMN listings.parking_spaces IS 'Total parking spots (garage + driveway)';
COMMENT ON COLUMN listings.stories IS 'Number of above-grade levels';
COMMENT ON COLUMN listings.basement_type IS 'none | finished | unfinished | crawlspace | walkout';
COMMENT ON COLUMN listings.heating_type IS 'forced_air | radiant | baseboard | heat_pump | boiler';
COMMENT ON COLUMN listings.cooling_type IS 'central | none | mini_split | window';
COMMENT ON COLUMN listings.roof_type IS 'asphalt | metal | tile | cedar | flat | other';
COMMENT ON COLUMN listings.exterior_type IS 'vinyl | wood | stucco | brick | stone | fiber_cement';
COMMENT ON COLUMN listings.flooring IS 'Array: hardwood, laminate, tile, carpet, vinyl, concrete';
COMMENT ON COLUMN listings.features IS 'Array: pool, deck, patio, fireplace, hot_tub, sprinklers, ev_charger, etc.';
