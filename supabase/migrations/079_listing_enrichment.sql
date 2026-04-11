-- 079_listing_enrichment.sql
--
-- Property data enrichment — BC Geocoder + ParcelMap BC + LTSA +
-- BC Assessment + strata data for each listing.
--
-- Background: like seller_identities (see migration 078), this table
-- existed in the live database but had NO migration file in the repo.
-- It must have been created by hand during early development. The
-- 2026-04-09 Supabase consolidation reconstructed the schema via
-- pg_catalog introspection. This migration captures that reconstruction
-- so fresh Supabase projects spun up from the repo will have the table.
--
-- All enrichment data is stored as JSONB because the external APIs
-- return heterogeneous shapes that are easier to treat opaquely.
--
-- Each listing has at most one enrichment row (enforced by the unique
-- index on listing_id). The `enrich_status` jsonb tracks which
-- enrichment sources have been fetched and whether they succeeded.
--
-- Idempotent: IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS listing_enrichment (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  geo            jsonb,  -- BC Geocoder result: lat/lng, structured address, confidence
  parcel         jsonb,  -- ParcelMap BC result: PID, legal description, plan, area
  ltsa           jsonb,  -- Land Title Survey Authority result: title #, charges, liens, ownership
  assessment     jsonb,  -- BC Assessment result: assessed values, classification, last update
  strata         jsonb,  -- Strata plan details (if applicable)
  enrich_status  jsonb NOT NULL DEFAULT '{"geo": "pending", "ltsa": "pending", "parcel": "pending", "assessment": "pending"}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  realtor_id     uuid REFERENCES users(id) ON DELETE CASCADE
);

-- One enrichment row per listing (unique). Without this, race conditions
-- in the enrichment worker could create duplicate rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_enrichment_listing
  ON listing_enrichment(listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_enrichment_realtor
  ON listing_enrichment(realtor_id);

ALTER TABLE listing_enrichment ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped policy. Legacy rows with NULL realtor_id are visible
-- during the multi-tenancy transition.
DROP POLICY IF EXISTS listing_enrichment_tenant ON listing_enrichment;
CREATE POLICY listing_enrichment_tenant ON listing_enrichment
  FOR ALL USING (
    realtor_id IS NULL
    OR realtor_id = auth.uid()::uuid
  );

-- updated_at trigger — reuses set_updated_at() from migration 074 or 078
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listing_enrichment_updated_at ON listing_enrichment;
CREATE TRIGGER trg_listing_enrichment_updated_at
  BEFORE UPDATE ON listing_enrichment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
