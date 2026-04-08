-- Migration 074: Contact Role System
-- Adds roles[], buyer_journeys, buyer_journey_properties, contact_portfolio
-- PRD: docs/PRD_Contact_Role_System.md v1.1
-- Idempotent: all statements use IF NOT EXISTS / DO $$ guards
-- Rollback: supabase/rollbacks/074_rollback.sql

-- ============================================================
-- 1. contacts — add roles[] and update lifecycle_stage
-- ============================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- Backfill any NULLs before enforcing NOT NULL
UPDATE contacts SET roles = '{}' WHERE roles IS NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_roles
  ON contacts USING GIN(roles);

-- lifecycle_stage already exists (migration 009, default 'active').
-- MUST migrate ALL existing non-valid values BEFORE adding the CHECK constraint.

-- Map seed/legacy values to valid constraint values
UPDATE contacts SET lifecycle_stage = 'active_buyer'    WHERE type = 'buyer'   AND lifecycle_stage IN ('active', 'lead', 'prospect');
UPDATE contacts SET lifecycle_stage = 'active_seller'   WHERE type = 'seller'  AND lifecycle_stage IN ('active', 'lead', 'prospect');
UPDATE contacts SET lifecycle_stage = 'referral_partner' WHERE type = 'partner' AND lifecycle_stage IN ('active', 'lead', 'prospect');
UPDATE contacts SET lifecycle_stage = 'past_client'     WHERE lifecycle_stage IN ('dormant', 'cold');
UPDATE contacts SET lifecycle_stage = 'nurture'         WHERE lifecycle_stage = 'lead';
UPDATE contacts SET lifecycle_stage = 'prospect'        WHERE lifecycle_stage NOT IN (
  'prospect','nurture','active_buyer','active_seller',
  'dual_client','under_contract','closed','past_client','referral_partner'
);

-- Update default to 'prospect'
ALTER TABLE contacts
  ALTER COLUMN lifecycle_stage SET DEFAULT 'prospect';

-- Add CHECK constraint (safe now that all values are valid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contacts_lifecycle_stage_check'
      AND conrelid = 'contacts'::regclass
  ) THEN
    ALTER TABLE contacts
      ADD CONSTRAINT contacts_lifecycle_stage_check
      CHECK (lifecycle_stage IN (
        'prospect','nurture','active_buyer','active_seller',
        'dual_client','under_contract','closed','past_client','referral_partner'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_lifecycle
  ON contacts(lifecycle_stage);

-- Seed roles[] from existing type column (idempotent: only fills empty rows)
UPDATE contacts
  SET roles = ARRAY[type]
  WHERE type IS NOT NULL AND roles = '{}';

-- ============================================================
-- 2. listings — buyer linkage columns
-- (buyer_journey_id FK added in section 7 after buyer_journeys exists)
-- ============================================================

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS buyer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listings_buyer_contact ON listings(buyer_contact_id);

-- ============================================================
-- 3. appointments — buyer linkage columns
-- (journey_property_id FK added in section 7)
-- ============================================================

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS buyer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_buyer_contact ON appointments(buyer_contact_id);

-- ============================================================
-- 4. buyer_journeys
-- ============================================================

CREATE TABLE IF NOT EXISTS buyer_journeys (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id             UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status                 TEXT NOT NULL DEFAULT 'searching'
                           CHECK (status IN (
                             'searching','viewing','offer_made','conditional',
                             'firm','closed','paused','cancelled'
                           )),
  min_price              NUMERIC,
  max_price              NUMERIC,
  pre_approval_amount    NUMERIC,
  financing_status       TEXT,
  preferred_areas        TEXT[] NOT NULL DEFAULT '{}',
  property_types         TEXT[] NOT NULL DEFAULT '{}',
  min_beds               INTEGER,
  max_beds               INTEGER,
  min_baths              NUMERIC,
  must_haves             TEXT[] NOT NULL DEFAULT '{}',
  nice_to_haves          TEXT[] NOT NULL DEFAULT '{}',
  target_close_date      DATE,
  urgency                TEXT CHECK (urgency IN ('low','medium','high','very_high')),
  conditional_on_sale    BOOLEAN NOT NULL DEFAULT false,
  conditional_listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  notes                  TEXT,
  ai_buyer_score         INTEGER CHECK (ai_buyer_score BETWEEN 1 AND 100),
  ai_summary             TEXT,
  purchased_address      TEXT,
  purchase_price         NUMERIC,
  purchase_date          DATE,
  linked_portfolio_id    UUID, -- FK added after contact_portfolio exists (section 7)
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One journey per (realtor, contact) to prevent duplicates
-- Use a partial UNIQUE on active journeys only (allows historical closed journeys)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bj_one_active_per_contact
  ON buyer_journeys(realtor_id, contact_id)
  WHERE status NOT IN ('closed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_bj_realtor        ON buyer_journeys(realtor_id);
CREATE INDEX IF NOT EXISTS idx_bj_contact        ON buyer_journeys(contact_id);
CREATE INDEX IF NOT EXISTS idx_bj_status         ON buyer_journeys(status);
CREATE INDEX IF NOT EXISTS idx_bj_price          ON buyer_journeys(min_price, max_price);
CREATE INDEX IF NOT EXISTS idx_bj_areas          ON buyer_journeys USING GIN(preferred_areas);
CREATE INDEX IF NOT EXISTS idx_bj_types          ON buyer_journeys USING GIN(property_types);
CREATE INDEX IF NOT EXISTS idx_bj_conditional    ON buyer_journeys(conditional_listing_id);

ALTER TABLE buyer_journeys ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'buyer_journeys' AND policyname = 'bj_tenant'
  ) THEN
    CREATE POLICY bj_tenant ON buyer_journeys
      FOR ALL USING (realtor_id = auth.uid()::uuid);
  END IF;
END $$;

-- ============================================================
-- 5. buyer_journey_properties
-- ============================================================

CREATE TABLE IF NOT EXISTS buyer_journey_properties (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id           UUID NOT NULL REFERENCES buyer_journeys(id) ON DELETE CASCADE,
  contact_id           UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  listing_id           UUID REFERENCES listings(id) ON DELETE SET NULL,
  mls_number           TEXT,
  address              TEXT NOT NULL,
  list_price           NUMERIC,
  property_type        TEXT,
  status               TEXT NOT NULL DEFAULT 'interested'
                         CHECK (status IN (
                           'interested','scheduled','viewed',
                           'offer_pending','offer_made','accepted',
                           'rejected','withdrawn','closed'
                         )),
  interest_level       INTEGER CHECK (interest_level BETWEEN 1 AND 5),
  notes                TEXT,
  showing_id           UUID REFERENCES appointments(id) ON DELETE SET NULL,
  offer_price          NUMERIC,
  offer_date           DATE,
  offer_expiry         TIMESTAMPTZ,
  offer_status         TEXT CHECK (offer_status IN (
                         'pending','accepted','rejected','countered','withdrawn','subject_removed'
                       )),
  counter_price        NUMERIC,
  subjects             TEXT[] NOT NULL DEFAULT '{}',
  subject_removal_date DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate properties per journey (same address or MLS# in the same journey)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bjp_unique_address
  ON buyer_journey_properties(journey_id, address);

CREATE INDEX IF NOT EXISTS idx_bjp_realtor   ON buyer_journey_properties(realtor_id);
CREATE INDEX IF NOT EXISTS idx_bjp_journey   ON buyer_journey_properties(journey_id);
CREATE INDEX IF NOT EXISTS idx_bjp_contact   ON buyer_journey_properties(contact_id);
CREATE INDEX IF NOT EXISTS idx_bjp_listing   ON buyer_journey_properties(listing_id);
CREATE INDEX IF NOT EXISTS idx_bjp_status    ON buyer_journey_properties(status);
CREATE INDEX IF NOT EXISTS idx_bjp_showing   ON buyer_journey_properties(showing_id);

ALTER TABLE buyer_journey_properties ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'buyer_journey_properties' AND policyname = 'bjp_tenant'
  ) THEN
    CREATE POLICY bjp_tenant ON buyer_journey_properties
      FOR ALL USING (realtor_id = auth.uid()::uuid);
  END IF;
END $$;

-- ============================================================
-- 6. contact_portfolio
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_portfolio (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id            UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  address               TEXT NOT NULL,
  unit_number           TEXT,
  city                  TEXT,
  province              TEXT NOT NULL DEFAULT 'BC',
  postal_code           TEXT,
  property_type         TEXT,
  property_category     TEXT CHECK (property_category IN (
                          'primary_residence','investment','vacation','commercial','other'
                        )),
  ownership_pct         NUMERIC NOT NULL DEFAULT 100 CHECK (ownership_pct BETWEEN 0 AND 100),
  co_owners             JSONB NOT NULL DEFAULT '[]',
  purchase_price        NUMERIC,
  purchase_date         DATE,
  estimated_value       NUMERIC,
  bc_assessed_value     NUMERIC,
  mortgage_balance      NUMERIC,
  monthly_rental_income NUMERIC,
  strata_fee            NUMERIC,
  status                TEXT NOT NULL DEFAULT 'owned'
                          CHECK (status IN (
                            'owned','selling','sold','refinancing','transferred'
                          )),
  linked_listing_id     UUID REFERENCES listings(id) ON DELETE SET NULL,
  source_journey_id     UUID REFERENCES buyer_journeys(id) ON DELETE SET NULL,
  notes                 TEXT,
  enrichment_data       JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_realtor   ON contact_portfolio(realtor_id);
CREATE INDEX IF NOT EXISTS idx_cp_contact   ON contact_portfolio(contact_id);
CREATE INDEX IF NOT EXISTS idx_cp_city      ON contact_portfolio(city);
CREATE INDEX IF NOT EXISTS idx_cp_status    ON contact_portfolio(status);
CREATE INDEX IF NOT EXISTS idx_cp_listing   ON contact_portfolio(linked_listing_id);
CREATE INDEX IF NOT EXISTS idx_cp_journey   ON contact_portfolio(source_journey_id);
CREATE INDEX IF NOT EXISTS idx_cp_addr_fts  ON contact_portfolio
  USING GIN(to_tsvector('english', address));

ALTER TABLE contact_portfolio ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_portfolio' AND policyname = 'cp_tenant'
  ) THEN
    CREATE POLICY cp_tenant ON contact_portfolio
      FOR ALL USING (realtor_id = auth.uid()::uuid);
  END IF;
END $$;

-- ============================================================
-- 7. Deferred FK columns (require tables to exist first)
-- ============================================================

-- listings.buyer_journey_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'listings'
      AND column_name = 'buyer_journey_id'
  ) THEN
    ALTER TABLE listings ADD COLUMN buyer_journey_id UUID
      REFERENCES buyer_journeys(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listings_buyer_journey ON listings(buyer_journey_id);

-- appointments.journey_property_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'journey_property_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN journey_property_id UUID
      REFERENCES buyer_journey_properties(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_journey_property ON appointments(journey_property_id);

-- buyer_journeys.linked_portfolio_id FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'buyer_journeys_linked_portfolio_id_fkey'
      AND conrelid = 'buyer_journeys'::regclass
  ) THEN
    ALTER TABLE buyer_journeys
      ADD CONSTRAINT buyer_journeys_linked_portfolio_id_fkey
      FOREIGN KEY (linked_portfolio_id) REFERENCES contact_portfolio(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 8. Migrate buyer_preferences.properties_of_interest → buyer_journey_properties
-- Safe to re-run: partial UNIQUE on (journey_id, address) prevents duplicates
-- ============================================================

DO $$
DECLARE
  r    RECORD;
  jid  UUID;
  prop JSONB;
  stage_val TEXT;
BEGIN
  FOR r IN
    SELECT id, realtor_id, buyer_preferences
    FROM contacts
    WHERE buyer_preferences IS NOT NULL
      AND buyer_preferences != 'null'::jsonb
      AND (buyer_preferences -> 'properties_of_interest') IS NOT NULL
      AND jsonb_array_length(buyer_preferences -> 'properties_of_interest') > 0
  LOOP
    -- Map legacy stage values to valid CHECK values
    stage_val := COALESCE(r.buyer_preferences ->>'stage', 'searching');
    IF stage_val NOT IN ('searching','viewing','offer_made','conditional','firm','closed','paused','cancelled') THEN
      stage_val := 'searching';
    END IF;

    -- Create journey if no active one exists (partial UNIQUE handles conflicts)
    INSERT INTO buyer_journeys (
      realtor_id, contact_id, status,
      min_price, max_price, pre_approval_amount,
      preferred_areas, property_types,
      min_beds, min_baths, notes
    )
    VALUES (
      r.realtor_id, r.id, stage_val,
      (r.buyer_preferences ->>'min_price')::NUMERIC,
      (r.buyer_preferences ->>'max_price')::NUMERIC,
      (r.buyer_preferences ->>'pre_approval_amount')::NUMERIC,
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(r.buyer_preferences ->'preferred_areas', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(r.buyer_preferences ->'property_types',  '[]'::jsonb))),
      (r.buyer_preferences ->>'min_beds')::INTEGER,
      (r.buyer_preferences ->>'min_baths')::NUMERIC,
      r.buyer_preferences ->>'notes'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO jid;

    -- Fetch existing journey if insert was skipped
    IF jid IS NULL THEN
      SELECT id INTO jid FROM buyer_journeys
        WHERE contact_id = r.id AND realtor_id = r.realtor_id
        LIMIT 1;
    END IF;

    CONTINUE WHEN jid IS NULL;

    -- Insert each property of interest (UNIQUE on journey_id, address prevents dupes)
    FOR prop IN
      SELECT jsonb_array_elements(r.buyer_preferences -> 'properties_of_interest')
    LOOP
      INSERT INTO buyer_journey_properties (
        realtor_id, journey_id, contact_id,
        address, mls_number, list_price,
        property_type, interest_level, notes, status
      )
      VALUES (
        r.realtor_id, jid, r.id,
        COALESCE(prop ->>'address', 'Unknown Address'),
        prop ->>'mls_number',
        (prop ->>'list_price')::NUMERIC,
        prop ->>'property_type',
        (prop ->>'interest_level')::INTEGER,
        prop ->>'notes',
        CASE
          WHEN (prop ->>'status') IN ('interested','scheduled','viewed','offer_pending',
            'offer_made','accepted','rejected','withdrawn','closed')
          THEN (prop ->>'status')
          ELSE 'interested'
        END
      )
      ON CONFLICT (journey_id, address) DO NOTHING;
    END LOOP;

  END LOOP;
END $$;
