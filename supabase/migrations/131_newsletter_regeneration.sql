ALTER TABLE newsletters ADD COLUMN IF NOT EXISTS regeneration_count INT DEFAULT 0;
