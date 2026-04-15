-- =============================================================================
-- Migration 116: editorial_transactions — agent property transactions
-- Links to just_sold and other editorial blocks
-- =============================================================================

CREATE TABLE IF NOT EXISTS editorial_transactions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address         text        NOT NULL,
  city            text        NOT NULL DEFAULT 'Vancouver',
  province        text        NOT NULL DEFAULT 'BC',
  transaction_type text       NOT NULL DEFAULT 'just_sold' CHECK (transaction_type IN (
                    'just_sold', 'just_listed', 'coming_soon', 'price_reduced'
                  )),
  sale_price      bigint,       -- in cents, null if not sold
  list_price      bigint        NOT NULL,  -- in cents
  days_on_market  integer,
  bedrooms        integer,
  bathrooms       numeric(3,1),
  sqft            integer,
  photo_url       text,
  headline        text,         -- max 120 chars
  story           text,         -- max 600 chars
  sold_at         date,
  listed_at       date,
  is_featured     boolean       NOT NULL DEFAULT false,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editorial_transactions_realtor_id
  ON editorial_transactions (realtor_id);

CREATE INDEX IF NOT EXISTS idx_editorial_transactions_type
  ON editorial_transactions (realtor_id, transaction_type);

CREATE INDEX IF NOT EXISTS idx_editorial_transactions_featured
  ON editorial_transactions (realtor_id, is_featured)
  WHERE is_featured = true;

ALTER TABLE editorial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editorial_transactions_realtor_policy ON editorial_transactions;
CREATE POLICY editorial_transactions_realtor_policy
  ON editorial_transactions
  FOR ALL
  USING (realtor_id = auth.uid());

DROP TRIGGER IF EXISTS trg_editorial_transactions_updated_at ON editorial_transactions;
CREATE TRIGGER trg_editorial_transactions_updated_at
  BEFORE UPDATE ON editorial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
