-- 011: Add stage_bar column to contacts
-- Tracks the pipeline stage for each contact (buyer vs seller have different valid values)

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stage_bar TEXT;

-- Backfill from lead_status
-- Buyer: new, qualified, active_search, under_contract, closed, cold
-- Seller: new, qualified, active_listing, under_contract, closed, cold

UPDATE contacts
SET stage_bar = CASE lead_status
  WHEN 'new'            THEN 'new'
  WHEN 'contacted'      THEN 'new'
  WHEN 'qualified'      THEN 'qualified'
  WHEN 'nurturing'      THEN 'qualified'
  WHEN 'active'         THEN CASE type WHEN 'seller' THEN 'active_listing' ELSE 'active_search' END
  WHEN 'under_contract' THEN 'under_contract'
  WHEN 'closed'         THEN 'closed'
  WHEN 'lost'           THEN 'cold'
  ELSE 'new'
END
WHERE stage_bar IS NULL;
