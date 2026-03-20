-- Migration 019: Contact data consistency trigger
-- Safety net at the DB level to prevent invalid field combinations

CREATE OR REPLACE FUNCTION enforce_contact_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Partner/other contacts can't have buyer/seller stages
  IF NEW.type IN ('partner', 'other') AND NEW.stage_bar IS NOT NULL
     AND NEW.stage_bar != 'cold' THEN
    NEW.stage_bar := NULL;
  END IF;

  -- Sync closed stage ↔ closed lead_status
  IF NEW.stage_bar = 'closed' AND NEW.lead_status != 'closed' THEN
    NEW.lead_status := 'closed';
  END IF;
  IF NEW.lead_status = 'closed' AND NEW.stage_bar IS NOT NULL AND NEW.stage_bar != 'closed' THEN
    NEW.stage_bar := 'closed';
  END IF;

  -- Sync cold stage ↔ lost lead_status
  IF NEW.stage_bar = 'cold' AND NEW.lead_status != 'lost' THEN
    NEW.lead_status := 'lost';
  END IF;
  IF NEW.lead_status = 'lost' AND NEW.stage_bar IS NOT NULL AND NEW.stage_bar != 'cold' THEN
    NEW.stage_bar := 'cold';
  END IF;

  -- Buyer can't have seller-only stages
  IF NEW.type = 'buyer' AND NEW.stage_bar = 'active_listing' THEN
    NEW.stage_bar := 'active_search';
  END IF;

  -- Seller can't have buyer-only stages
  IF NEW.type = 'seller' AND NEW.stage_bar = 'active_search' THEN
    NEW.stage_bar := 'active_listing';
  END IF;

  -- If type changes to partner/other, clear stage
  IF TG_OP = 'UPDATE' AND OLD.type IN ('buyer', 'seller')
     AND NEW.type IN ('partner', 'other') THEN
    NEW.stage_bar := NULL;
  END IF;

  -- If type changes between buyer/seller, fix stage
  IF TG_OP = 'UPDATE' AND OLD.type = 'buyer' AND NEW.type = 'seller'
     AND NEW.stage_bar = 'active_search' THEN
    NEW.stage_bar := 'active_listing';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.type = 'seller' AND NEW.type = 'buyer'
     AND NEW.stage_bar = 'active_listing' THEN
    NEW.stage_bar := 'active_search';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS contact_consistency_trigger ON contacts;

-- Create trigger on insert and update
CREATE TRIGGER contact_consistency_trigger
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION enforce_contact_consistency();
