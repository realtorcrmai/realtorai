-- 015: Seed completed buyer purchases with property and mortgage details
-- Updates Kim and Patel deals to closed/won, adds Park family as new completed buyer deal

DO $$
DECLARE
  -- Existing contact/deal references
  v_kim_contact_id   UUID;
  v_kim_deal_id      UUID;
  v_patel_contact_id UUID;
  v_patel_deal_id    UUID;
  v_park_contact_id  UUID;
  -- New records
  v_park_deal_id     UUID;
  v_park_listing_id  UUID;
  v_park_seller_id   UUID;
BEGIN

  ---------------------------------------------------------------
  -- 1. KIM FAMILY — Close the deal as won
  ---------------------------------------------------------------

  SELECT d.id, d.contact_id INTO v_kim_deal_id, v_kim_contact_id
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE c.name = 'Sarah & James Kim' AND d.type = 'buyer'
    LIMIT 1;

  IF v_kim_deal_id IS NOT NULL THEN
    -- Update deal to closed/won
    UPDATE deals SET
      stage = 'closed',
      status = 'won',
      title = 'Kim Family - 2845 Triumph St PURCHASED',
      value = 1120000.00,
      commission_amount = 33600.00,
      close_date = (CURRENT_DATE - INTERVAL '5 days')::DATE,
      possession_date = (CURRENT_DATE + INTERVAL '25 days')::DATE,
      subject_removal_date = (CURRENT_DATE - INTERVAL '12 days')::DATE,
      notes = 'Purchased 4BR detached on Triumph St, Hastings-Sunrise. Great school catchment. Sold firm after subject removal.'
    WHERE id = v_kim_deal_id;

    -- Complete all checklist items
    UPDATE deal_checklist SET
      completed = true,
      completed_at = CASE sort_order
        WHEN 0  THEN NOW() - INTERVAL '40 days'   -- Pre-approval letter obtained
        WHEN 1  THEN NOW() - INTERVAL '30 days'   -- Property viewed
        WHEN 2  THEN NOW() - INTERVAL '20 days'   -- Offer submitted
        WHEN 3  THEN NOW() - INTERVAL '18 days'   -- Offer accepted
        WHEN 4  THEN NOW() - INTERVAL '16 days'   -- Home inspection scheduled
        WHEN 5  THEN NOW() - INTERVAL '14 days'   -- Home inspection completed
        WHEN 6  THEN NOW() - INTERVAL '13 days'   -- Appraisal ordered
        WHEN 7  THEN NOW() - INTERVAL '11 days'   -- Appraisal received
        WHEN 8  THEN NOW() - INTERVAL '10 days'   -- Subjects removed
        WHEN 9  THEN NOW() - INTERVAL '7 days'    -- Mortgage finalized
        WHEN 10 THEN NOW() - INTERVAL '6 days'    -- Title search completed
        WHEN 11 THEN NOW() - INTERVAL '5 days'    -- Closing documents signed
        WHEN 12 THEN NOW() - INTERVAL '5 days'    -- Keys received
        ELSE NOW() - INTERVAL '5 days'
      END
    WHERE deal_id = v_kim_deal_id;

    -- Update existing CIBC mortgage to finalized
    UPDATE mortgages SET
      mortgage_amount = 896000.00,
      interest_rate = 4.89,
      mortgage_type = 'fixed',
      term_months = 60,
      amortization_years = 25,
      start_date = (CURRENT_DATE - INTERVAL '5 days')::DATE,
      renewal_date = (CURRENT_DATE - INTERVAL '5 days' + INTERVAL '60 months')::DATE,
      monthly_payment = 5148.30,
      notes = 'Finalized fixed rate mortgage for 2845 Triumph St. 20% down ($224K). Rate locked at signing.'
    WHERE deal_id = v_kim_deal_id AND lender_name = 'CIBC';

    -- Add deal parties
    INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
      (v_kim_deal_id, 'lawyer', 'Grace Leung', '+16045559100', 'gleung@leunglaw.ca', 'Leung & Associates Law'),
      (v_kim_deal_id, 'inspector', 'Westcoast Home Inspections', '+16045559101', 'info@westcoastinspect.ca', 'Westcoast Home Inspections Ltd'),
      (v_kim_deal_id, 'appraiser', 'Metro Vancouver Appraisals', '+16045559102', 'appraisals@metrovan.ca', 'Metro Vancouver Appraisals Inc'),
      (v_kim_deal_id, 'seller_agent', 'Derek Fung', '+16045559103', 'derek.fung@remax.ca', 'RE/MAX City Realty');

    -- Closing communications
    INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
      (v_kim_contact_id, 'outbound', 'whatsapp', 'Sarah & James, congratulations! Your offer on 2845 Triumph St has been accepted at $1,120,000! Subject removal date is set for two weeks. Let''s get the inspection booked ASAP.', NOW() - INTERVAL '18 days'),
      (v_kim_contact_id, 'inbound', 'whatsapp', 'We are SO excited!! This is the perfect home for our family. Thank you for finding it! Yes, let''s book the inspection right away.', NOW() - INTERVAL '18 days' + INTERVAL '1 hour'),
      (v_kim_contact_id, 'outbound', 'whatsapp', 'Great news — all subjects have been removed! The home is officially yours. Possession date is confirmed. I''ll coordinate with the lawyers for closing.', NOW() - INTERVAL '10 days'),
      (v_kim_contact_id, 'outbound', 'email', 'Sarah & James, the sale of 2845 Triumph St is now complete. Keys will be available on possession day. Congratulations on your beautiful new home! It was a pleasure working with you both.', NOW() - INTERVAL '5 days');
  END IF;

  ---------------------------------------------------------------
  -- 2. PATEL — Close the investment property deal
  ---------------------------------------------------------------

  SELECT d.id, d.contact_id INTO v_patel_deal_id, v_patel_contact_id
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE c.name = 'Raj Patel' AND d.type = 'buyer'
    LIMIT 1;

  IF v_patel_deal_id IS NOT NULL THEN
    -- Update deal to closed/won
    UPDATE deals SET
      stage = 'closed',
      status = 'won',
      title = 'Patel - 4750 Kingsway Investment PURCHASED',
      value = 665000.00,
      commission_amount = 16625.00,
      close_date = (CURRENT_DATE - INTERVAL '8 days')::DATE,
      possession_date = (CURRENT_DATE + INTERVAL '15 days')::DATE,
      subject_removal_date = (CURRENT_DATE - INTERVAL '18 days')::DATE,
      notes = 'Investment 1BR+den at Metrotown. Purchased below asking at $665K. Expected rental income $2,400/mo. Strong cap rate.'
    WHERE id = v_patel_deal_id;

    -- Complete all checklist items
    UPDATE deal_checklist SET
      completed = true,
      completed_at = CASE sort_order
        WHEN 0  THEN NOW() - INTERVAL '45 days'   -- Pre-approval letter obtained
        WHEN 1  THEN NOW() - INTERVAL '35 days'   -- Property viewed
        WHEN 2  THEN NOW() - INTERVAL '25 days'   -- Offer submitted
        WHEN 3  THEN NOW() - INTERVAL '22 days'   -- Offer accepted
        WHEN 4  THEN NOW() - INTERVAL '20 days'   -- Home inspection scheduled
        WHEN 5  THEN NOW() - INTERVAL '18 days'   -- Home inspection completed
        WHEN 6  THEN NOW() - INTERVAL '17 days'   -- Appraisal ordered
        WHEN 7  THEN NOW() - INTERVAL '15 days'   -- Appraisal received
        WHEN 8  THEN NOW() - INTERVAL '14 days'   -- Subjects removed
        WHEN 9  THEN NOW() - INTERVAL '10 days'   -- Mortgage finalized
        WHEN 10 THEN NOW() - INTERVAL '9 days'    -- Title search completed
        WHEN 11 THEN NOW() - INTERVAL '8 days'    -- Closing documents signed
        WHEN 12 THEN NOW() - INTERVAL '8 days'    -- Keys received
        ELSE NOW() - INTERVAL '8 days'
      END
    WHERE deal_id = v_patel_deal_id;

    -- Update existing Scotiabank mortgage to finalized
    UPDATE mortgages SET
      mortgage_amount = 532000.00,
      interest_rate = 5.19,
      mortgage_type = 'fixed',
      term_months = 36,
      amortization_years = 25,
      start_date = (CURRENT_DATE - INTERVAL '8 days')::DATE,
      renewal_date = (CURRENT_DATE - INTERVAL '8 days' + INTERVAL '36 months')::DATE,
      monthly_payment = 3152.75,
      notes = 'Investment property mortgage finalized. 20% down ($133K). 3-year term for flexibility to refinance or sell. Rental income offsets ~76% of monthly payment.'
    WHERE deal_id = v_patel_deal_id AND lender_name = 'Scotiabank';

    -- Add deal parties
    INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
      (v_patel_deal_id, 'lawyer', 'Naveen Grewal', '+16045559200', 'ngrewal@grewallaw.ca', 'Grewal Law Corporation'),
      (v_patel_deal_id, 'inspector', 'Fraser Valley Inspections', '+16045559201', 'info@fvinspections.ca', 'Fraser Valley Inspections Ltd');

    -- Closing communications
    INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
      (v_patel_contact_id, 'outbound', 'sms', 'Raj, the seller accepted your offer of $665K on the Metrotown 1BR+den! Subject removal in 7 days. I''ll coordinate the inspection.', NOW() - INTERVAL '22 days'),
      (v_patel_contact_id, 'inbound', 'sms', 'Excellent! Below asking price, exactly what I wanted. Let me know about the inspection schedule.', NOW() - INTERVAL '22 days' + INTERVAL '30 minutes'),
      (v_patel_contact_id, 'outbound', 'sms', 'Subjects removed, mortgage finalized with Scotiabank. Your investment property at 4750 Kingsway is officially yours! Closing docs are with your lawyer Naveen Grewal.', NOW() - INTERVAL '8 days'),
      (v_patel_contact_id, 'outbound', 'email', 'Raj, congratulations on closing the purchase of your investment property at 4750 Kingsway, Burnaby. Expected rental income of ~$2,400/mo gives you a strong cap rate. Let me know if you''d like help finding a property manager or if you''re looking at additional investments.', NOW() - INTERVAL '7 days');
  END IF;

  ---------------------------------------------------------------
  -- 3. PARK FAMILY — New completed buyer deal
  ---------------------------------------------------------------

  -- Get Park contact
  SELECT id INTO v_park_contact_id
    FROM contacts
    WHERE name = 'Andrew & Lisa Park'
    LIMIT 1;

  IF v_park_contact_id IS NOT NULL THEN
    -- Create a seller contact for the Howe St property
    INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
    VALUES ('Robert & Anna Kovacs', '+16045559400', 'kovacs.ra@gmail.com', 'seller', 'sms', 'Sold their downtown Vancouver condo at 1455 Howe St to Park family.')
    RETURNING id INTO v_park_seller_id;

    -- Create a sold listing for the property they purchased
    INSERT INTO listings (address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes)
    VALUES (
      '1502-1455 Howe St, Vancouver, BC V6Z 1C2',
      v_park_seller_id, '1502', 'sold', 'V6789012', 785000.00,
      '10:00', '18:00',
      '2BR/2BA downtown condo, 15th floor, city views, walk score 98. Sold to Park family.'
    )
    RETURNING id INTO v_park_listing_id;

    -- Create completed buyer deal
    INSERT INTO deals (listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, possession_date, subject_removal_date, notes, created_at)
    VALUES (
      v_park_listing_id, v_park_contact_id, 'buyer', 'closed', 'won',
      'Park Family - 1455 Howe St Condo PURCHASED',
      785000.00, 3.0, 23550.00,
      (CURRENT_DATE - INTERVAL '10 days')::DATE,
      (CURRENT_DATE + INTERVAL '20 days')::DATE,
      (CURRENT_DATE - INTERVAL '20 days')::DATE,
      'Downsized from Langley detached to downtown Vancouver 2BR condo. Walk score 98, close to seawall. Empty nesters thrilled with the lifestyle change.',
      NOW() - INTERVAL '50 days'
    )
    RETURNING id INTO v_park_deal_id;

    -- Full completed buyer checklist
    INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
      (v_park_deal_id, 'Pre-approval letter obtained', true, NOW() - INTERVAL '50 days', 0),
      (v_park_deal_id, 'Property viewed', true, NOW() - INTERVAL '40 days', 1),
      (v_park_deal_id, 'Offer submitted', true, NOW() - INTERVAL '30 days', 2),
      (v_park_deal_id, 'Offer accepted', true, NOW() - INTERVAL '28 days', 3),
      (v_park_deal_id, 'Home inspection scheduled', true, NOW() - INTERVAL '26 days', 4),
      (v_park_deal_id, 'Home inspection completed', true, NOW() - INTERVAL '24 days', 5),
      (v_park_deal_id, 'Appraisal ordered', true, NOW() - INTERVAL '23 days', 6),
      (v_park_deal_id, 'Appraisal received', true, NOW() - INTERVAL '21 days', 7),
      (v_park_deal_id, 'Subjects removed', true, NOW() - INTERVAL '20 days', 8),
      (v_park_deal_id, 'Mortgage finalized', true, NOW() - INTERVAL '15 days', 9),
      (v_park_deal_id, 'Title search completed', true, NOW() - INTERVAL '12 days', 10),
      (v_park_deal_id, 'Closing documents signed', true, NOW() - INTERVAL '10 days', 11),
      (v_park_deal_id, 'Keys received', true, NOW() - INTERVAL '10 days', 12);

    -- Mortgage for Park family
    INSERT INTO mortgages (deal_id, contact_id, lender_name, mortgage_amount, interest_rate, mortgage_type, term_months, amortization_years, start_date, renewal_date, monthly_payment, lender_contact, lender_phone, lender_email, notes)
    VALUES (
      v_park_deal_id, v_park_contact_id,
      'TD Canada Trust', 549500.00, 4.69, 'fixed', 60, 20,
      (CURRENT_DATE - INTERVAL '10 days')::DATE,
      (CURRENT_DATE - INTERVAL '10 days' + INTERVAL '60 months')::DATE,
      3524.60,
      'Patricia Chen', '+16045559300', 'patricia.chen@td.com',
      'Downsizer mortgage. 30% down ($235.5K) from Langley home sale proceeds. 20-year amortization to be mortgage-free before retirement.'
    );

    -- Deal parties
    INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
      (v_park_deal_id, 'buyer_agent', 'You (Agent)', '+16045551000', 'agent@realtorcrm.ca', 'RE/MAX Crest Realty'),
      (v_park_deal_id, 'seller_agent', 'Michelle Tran', '+16045559301', 'michelle.tran@oakwyn.com', 'Oakwyn Realty'),
      (v_park_deal_id, 'lawyer', 'Steven Pang', '+16045559302', 'spang@pangnotary.ca', 'Pang Notary Public'),
      (v_park_deal_id, 'lender', 'Patricia Chen', '+16045559300', 'patricia.chen@td.com', 'TD Canada Trust'),
      (v_park_deal_id, 'inspector', 'Vancouver Home Check', '+16045559303', 'bookings@vanhomecheck.ca', 'Vancouver Home Check Inc');

    -- Communications
    INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
      (v_park_contact_id, 'outbound', 'sms', 'Andrew & Lisa, great news! I found a stunning 2BR on the 15th floor at 1455 Howe St. City views, walk score 98, and right in your budget at $785K. Want to see it this weekend?', NOW() - INTERVAL '42 days'),
      (v_park_contact_id, 'inbound', 'sms', 'That sounds perfect! Yes, Saturday morning works for us. We love the Yaletown area.', NOW() - INTERVAL '42 days' + INTERVAL '2 hours'),
      (v_park_contact_id, 'outbound', 'sms', 'Wonderful news — your offer on 1455 Howe St has been accepted at asking price! The seller loved your letter. Subject removal in 10 days.', NOW() - INTERVAL '28 days'),
      (v_park_contact_id, 'inbound', 'sms', 'Amazing!! Lisa is already planning the move. Thank you so much for all your help!', NOW() - INTERVAL '28 days' + INTERVAL '1 hour'),
      (v_park_contact_id, 'outbound', 'email', 'Andrew & Lisa, congratulations! The purchase of your new home at 1455 Howe St is now complete. Keys available on possession day. Welcome to downtown Vancouver — you''re going to love it! It has been a pleasure helping you with this transition.', NOW() - INTERVAL '10 days');

    -- Update Park contact notes
    UPDATE contacts SET
      notes = 'Downsized from Langley to downtown Vancouver condo at 1455 Howe St. Empty nesters. Closed March 2026. Very happy clients — potential referral source.'
    WHERE id = v_park_contact_id;
  END IF;

  RAISE NOTICE 'Completed buyer purchase seed data inserted successfully!';
END $$;
