-- 078_seller_identities.sql
--
-- FINTRAC compliance table for seller KYC / identity capture.
--
-- Background: this table existed in the live database for months but had
-- NO migration file in the repo — it must have been created by hand during
-- early development. The 2026-04-09 Supabase consolidation discovered this
-- gap while merging 3 projects into one (it was present in Aman's project
-- but not in the others), and reconstructed the schema via pg_catalog
-- introspection. This migration file captures that reconstruction so any
-- future fresh Supabase project spun up from the migration files in this
-- repo will have the table.
--
-- Column order and defaults match what was observed in the Aman-project
-- instance on 2026-04-09. Multi-tenancy via `realtor_id` was added later
-- by migrations 062/063/064/065 and is preserved here.
--
-- Idempotent: IF NOT EXISTS throughout, safe to re-run.

CREATE TABLE IF NOT EXISTS seller_identities (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  contact_id     uuid REFERENCES contacts(id) ON DELETE SET NULL,
  full_name      text NOT NULL,
  dob            date,
  citizenship    text DEFAULT 'canadian'::text,
  id_type        text DEFAULT 'drivers_license'::text,
  id_number      text,
  id_expiry      date,
  phone          text,
  email          text,
  mailing_address text,
  occupation     text,
  sort_order     integer DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  realtor_id     uuid REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_seller_identities_listing ON seller_identities(listing_id);
CREATE INDEX IF NOT EXISTS idx_seller_identities_realtor ON seller_identities(realtor_id);
CREATE INDEX IF NOT EXISTS idx_seller_identities_contact ON seller_identities(contact_id);

ALTER TABLE seller_identities ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped policy. realtor_id can be NULL for legacy rows created
-- before multi-tenancy was added — those rows are visible to any
-- authenticated user during the transition period.
DROP POLICY IF EXISTS seller_identities_tenant ON seller_identities;
CREATE POLICY seller_identities_tenant ON seller_identities
  FOR ALL USING (
    realtor_id IS NULL
    OR realtor_id = auth.uid()::uuid
  );

-- updated_at trigger — reuses the shared set_updated_at() function
-- created by migration 074_newsletter_engine_v3.sql. If that function
-- doesn't exist yet (e.g., on a fresh DB that runs 078 before 074 due
-- to numbering order), create it.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seller_identities_updated_at ON seller_identities;
CREATE TRIGGER trg_seller_identities_updated_at
  BEFORE UPDATE ON seller_identities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
