-- 010: Seed mortgage data for buyer deals
-- Adds realistic mortgage details to existing buyer deals

DO $$
DECLARE
  v_deal_id UUID;
  v_contact_id UUID;
BEGIN

  -- Torres deal (buyer: new_lead) - Pre-approval stage, basic mortgage info
  SELECT d.id, d.contact_id INTO v_deal_id, v_contact_id
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE c.name = 'Michael Torres' AND d.type = 'buyer'
    LIMIT 1;

  IF v_deal_id IS NOT NULL THEN
    INSERT INTO mortgages (deal_id, contact_id, lender_name, mortgage_amount, interest_rate, mortgage_type, term_months, amortization_years, start_date, renewal_date, monthly_payment, lender_contact, lender_phone, lender_email, notes)
    VALUES (
      v_deal_id, v_contact_id,
      'TD Canada Trust', 600000.00, 4.79, 'fixed', 60, 25,
      (NOW() - INTERVAL '3 months')::date,
      (NOW() + INTERVAL '57 months')::date,
      3432.18,
      'Maria Santos', '+16045551100', 'maria.santos@td.com',
      'Pre-approved at prime - 0.5%. Client has strong employment history.'
    );
  END IF;

  -- Kim deal (buyer: showing) - Active mortgage from previous home
  SELECT d.id, d.contact_id INTO v_deal_id, v_contact_id
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE c.name = 'Sarah & James Kim' AND d.type = 'buyer'
    LIMIT 1;

  IF v_deal_id IS NOT NULL THEN
    INSERT INTO mortgages (deal_id, contact_id, lender_name, mortgage_amount, interest_rate, mortgage_type, term_months, amortization_years, start_date, renewal_date, monthly_payment, lender_contact, lender_phone, lender_email, notes)
    VALUES (
      v_deal_id, v_contact_id,
      'RBC Royal Bank', 520000.00, 5.14, 'fixed', 60, 25,
      (NOW() - INTERVAL '42 months')::date,
      (NOW() + INTERVAL '18 months')::date,
      3064.50,
      'Brian Wong', '+16045552200', 'brian.wong@rbc.com',
      'Current mortgage on existing condo. Renewal coming up - considering portable mortgage option.'
    );

    -- Second mortgage record for the new property they are looking at
    INSERT INTO mortgages (deal_id, contact_id, lender_name, mortgage_amount, interest_rate, mortgage_type, term_months, amortization_years, start_date, renewal_date, monthly_payment, lender_contact, lender_phone, lender_email, notes)
    VALUES (
      v_deal_id, v_contact_id,
      'CIBC', 850000.00, 4.94, 'variable', 60, 30,
      NULL,
      (NOW() + INTERVAL '60 months')::date,
      4512.00,
      'Jessica Liu', '+16045553300', 'jessica.liu@cibc.com',
      'Pre-approval for new detached home purchase. Variable rate with option to lock in.'
    );
  END IF;

  -- Patel deal (buyer: offer) - Investment property mortgage
  SELECT d.id, d.contact_id INTO v_deal_id, v_contact_id
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE c.name = 'Raj Patel' AND d.type = 'buyer'
    LIMIT 1;

  IF v_deal_id IS NOT NULL THEN
    INSERT INTO mortgages (deal_id, contact_id, lender_name, mortgage_amount, interest_rate, mortgage_type, term_months, amortization_years, start_date, renewal_date, monthly_payment, lender_contact, lender_phone, lender_email, notes)
    VALUES (
      v_deal_id, v_contact_id,
      'Scotiabank', 454000.00, 5.29, 'fixed', 36, 25,
      (NOW() - INTERVAL '1 month')::date,
      (NOW() + INTERVAL '35 months')::date,
      2715.40,
      'Amandeep Dhillon', '+17785554400', 'amandeep.dhillon@scotiabank.com',
      'Investment property mortgage. 20% down payment. Shorter 3-year term for flexibility.'
    );
  END IF;

  -- Nguyen deal (buyer: qualified/lost) - Had pre-approval before deal fell through
  SELECT d.id, d.contact_id INTO v_deal_id, v_contact_id
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE c.name = 'Emily Nguyen' AND d.type = 'buyer'
    LIMIT 1;

  IF v_deal_id IS NOT NULL THEN
    INSERT INTO mortgages (deal_id, contact_id, lender_name, mortgage_amount, interest_rate, mortgage_type, term_months, amortization_years, start_date, renewal_date, monthly_payment, lender_contact, lender_phone, lender_email, notes)
    VALUES (
      v_deal_id, v_contact_id,
      'BMO Bank of Montreal', 680000.00, 4.99, 'arm', 60, 25,
      NULL, NULL,
      3890.00,
      'David Park', '+16045555500', 'david.park@bmo.com',
      'Pre-approval expired when deal fell through. Client may re-apply for new property.'
    );
  END IF;

END $$;
