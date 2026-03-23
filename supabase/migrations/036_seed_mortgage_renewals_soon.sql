-- 017: Update mortgage renewal dates to trigger upcoming renewal notifications
-- Sets 3 mortgages to have renewal_date within 90 days so dashboard alerts appear

DO $$
DECLARE
  v_mortgage_id UUID;
BEGIN

  -- Kim's RBC mortgage: set renewal to 25 days from now
  UPDATE mortgages
    SET renewal_date = (NOW() + INTERVAL '25 days')::date,
        notes = 'Current mortgage on existing condo. RENEWAL IMMINENT - need to discuss porting or new terms.'
    WHERE lender_name = 'RBC Royal Bank'
      AND contact_id = (SELECT id FROM contacts WHERE name = 'Sarah & James Kim' LIMIT 1);

  -- Patel's Scotiabank mortgage: set renewal to 55 days from now
  UPDATE mortgages
    SET renewal_date = (NOW() + INTERVAL '55 days')::date,
        notes = 'Investment property mortgage. Renewal coming up - evaluate variable vs fixed switch.'
    WHERE lender_name = 'Scotiabank'
      AND contact_id = (SELECT id FROM contacts WHERE name = 'Raj Patel' LIMIT 1);

  -- Torres' TD mortgage: set renewal to 80 days from now
  UPDATE mortgages
    SET renewal_date = (NOW() + INTERVAL '80 days')::date,
        notes = 'Pre-approved at prime - 0.5%. Renewal approaching - review rate options with client.'
    WHERE lender_name = 'TD Canada Trust'
      AND contact_id = (SELECT id FROM contacts WHERE name = 'Michael Torres' LIMIT 1);

END $$;
