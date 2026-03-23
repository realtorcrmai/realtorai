-- 016: Seed completed seller sales
-- Advances O'Brien and Chen deals to closed/won with sold listings,
-- completed checklists, and closing communications

DO $$
DECLARE
  v_obrien_contact_id UUID;
  v_obrien_deal_id    UUID;
  v_obrien_listing_id UUID;
  v_chen_contact_id   UUID;
  v_chen_deal_id      UUID;
  v_chen_listing_id   UUID;
BEGIN

  ---------------------------------------------------------------
  -- 1. O'BRIEN — Close the sale (was conditional → now sold)
  ---------------------------------------------------------------

  SELECT d.id, d.contact_id, d.listing_id INTO v_obrien_deal_id, v_obrien_contact_id, v_obrien_listing_id
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE c.name LIKE 'Margaret O%Brien%' AND d.type = 'seller'
    LIMIT 1;

  IF v_obrien_deal_id IS NOT NULL THEN
    -- Update listing to sold
    UPDATE listings SET status = 'sold'
    WHERE id = v_obrien_listing_id;

    -- Update deal to closed/won
    UPDATE deals SET
      stage = 'closed',
      status = 'won',
      title = 'O''Brien - 15234 Royal Ave SOLD',
      value = 1650000.00,
      commission_amount = 57750.00,
      close_date = (CURRENT_DATE - INTERVAL '4 days')::DATE,
      possession_date = (CURRENT_DATE + INTERVAL '26 days')::DATE,
      notes = 'Sold at $1.65M after subject removal. Buyer financed through RBC. Smooth closing. Margaret downsizing to condo.'
    WHERE id = v_obrien_deal_id;

    -- Complete all seller checklist items
    UPDATE deal_checklist SET
      completed = true,
      completed_at = CASE sort_order
        WHEN 0  THEN NOW() - INTERVAL '30 days'   -- Comparative market analysis
        WHEN 1  THEN NOW() - INTERVAL '28 days'   -- Listing agreement signed
        WHEN 2  THEN NOW() - INTERVAL '26 days'   -- Property photos taken
        WHEN 3  THEN NOW() - INTERVAL '25 days'   -- MLS listing published
        WHEN 4  THEN NOW() - INTERVAL '24 days'   -- Lockbox installed
        WHEN 5  THEN NOW() - INTERVAL '20 days'   -- Open house scheduled
        WHEN 6  THEN NOW() - INTERVAL '14 days'   -- Offer received
        WHEN 7  THEN NOW() - INTERVAL '12 days'   -- Offer accepted
        WHEN 8  THEN NOW() - INTERVAL '8 days'    -- Buyer conditions review
        WHEN 9  THEN NOW() - INTERVAL '6 days'    -- Subjects removed
        WHEN 10 THEN NOW() - INTERVAL '5 days'    -- Closing documents prepared
        WHEN 11 THEN NOW() - INTERVAL '4 days'    -- Closing completed
        WHEN 12 THEN NOW() - INTERVAL '4 days'    -- Possession transferred
        ELSE NOW() - INTERVAL '4 days'
      END
    WHERE deal_id = v_obrien_deal_id;

    -- Add appraiser deal party
    INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
      (v_obrien_deal_id, 'appraiser', 'South Fraser Appraisals', '+16045559500', 'info@southfraserappraisals.ca', 'South Fraser Appraisals Inc');

    -- Closing communications
    INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
      (v_obrien_contact_id, 'outbound', 'sms', 'Margaret, all subjects have been removed on your Royal Ave property! The buyer has confirmed financing. We are on track for closing next week.', NOW() - INTERVAL '6 days'),
      (v_obrien_contact_id, 'inbound', 'sms', 'Wonderful news! Thank you for handling everything so smoothly. I am looking forward to the next chapter.', NOW() - INTERVAL '6 days' + INTERVAL '2 hours'),
      (v_obrien_contact_id, 'outbound', 'email', 'Margaret, I am delighted to confirm that the sale of 15234 Royal Ave has officially closed at $1,650,000. Proceeds have been sent to your lawyer Diana Reeves. Congratulations on 25 wonderful years in that home, and best wishes for your next adventure!', NOW() - INTERVAL '4 days'),
      (v_obrien_contact_id, 'inbound', 'email', 'Thank you so much for everything. You made the whole process so easy. I will definitely be referring you to friends. Now time to find a nice condo!', NOW() - INTERVAL '3 days');

    -- Update contact notes
    UPDATE contacts SET
      notes = 'Sold White Rock family home at $1.65M after 25 years. Downsizing to condo. Excellent referral source — well connected in community.'
    WHERE id = v_obrien_contact_id;
  END IF;

  ---------------------------------------------------------------
  -- 2. CHEN — Close the sale (was showing → now sold)
  ---------------------------------------------------------------

  SELECT d.id, d.contact_id, d.listing_id INTO v_chen_deal_id, v_chen_contact_id, v_chen_listing_id
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE c.name = 'David Chen' AND d.type = 'seller'
    LIMIT 1;

  IF v_chen_deal_id IS NOT NULL THEN
    -- Update listing to sold
    UPDATE listings SET status = 'sold'
    WHERE id = v_chen_listing_id;

    -- Update deal to closed/won
    UPDATE deals SET
      stage = 'closed',
      status = 'won',
      title = 'Chen - 1288 W Georgia SOLD',
      value = 1285000.00,
      commission_amount = 32125.00,
      close_date = (CURRENT_DATE - INTERVAL '2 days')::DATE,
      possession_date = (CURRENT_DATE + INTERVAL '28 days')::DATE,
      subject_removal_date = (CURRENT_DATE - INTERVAL '9 days')::DATE,
      notes = 'Sold $35K over asking! Multiple offers received after strong open house weekend. Buyer is a downsizer from West Van, cash offer.'
    WHERE id = v_chen_deal_id;

    -- Complete all seller checklist items
    UPDATE deal_checklist SET
      completed = true,
      completed_at = CASE sort_order
        WHEN 0  THEN NOW() - INTERVAL '25 days'   -- Comparative market analysis
        WHEN 1  THEN NOW() - INTERVAL '24 days'   -- Listing agreement signed
        WHEN 2  THEN NOW() - INTERVAL '22 days'   -- Property photos taken
        WHEN 3  THEN NOW() - INTERVAL '21 days'   -- MLS listing published
        WHEN 4  THEN NOW() - INTERVAL '20 days'   -- Lockbox installed
        WHEN 5  THEN NOW() - INTERVAL '16 days'   -- Open house scheduled
        WHEN 6  THEN NOW() - INTERVAL '12 days'   -- Offer received
        WHEN 7  THEN NOW() - INTERVAL '11 days'   -- Offer accepted
        WHEN 8  THEN NOW() - INTERVAL '9 days'    -- Buyer conditions review
        WHEN 9  THEN NOW() - INTERVAL '7 days'    -- Subjects removed
        WHEN 10 THEN NOW() - INTERVAL '4 days'    -- Closing documents prepared
        WHEN 11 THEN NOW() - INTERVAL '2 days'    -- Closing completed
        WHEN 12 THEN NOW() - INTERVAL '2 days'    -- Possession transferred
        ELSE NOW() - INTERVAL '2 days'
      END
    WHERE deal_id = v_chen_deal_id;

    -- Add more deal parties for the completed sale
    INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
      (v_chen_deal_id, 'appraiser', 'Vancouver Coastal Appraisals', '+16045559510', 'info@vcappraisals.ca', 'Vancouver Coastal Appraisals Ltd'),
      (v_chen_deal_id, 'inspector', 'Elite Home Inspections', '+16045559511', 'book@eliteinspect.ca', 'Elite Home Inspections Inc');

    -- Closing communications
    INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
      (v_chen_contact_id, 'outbound', 'sms', 'David, great news! We received 3 offers on your Georgia St condo. The best is $1,285,000 — cash buyer, no subjects. I recommend we accept.', NOW() - INTERVAL '11 days'),
      (v_chen_contact_id, 'inbound', 'sms', 'That is $35K over asking! Absolutely accept. Well done.', NOW() - INTERVAL '11 days' + INTERVAL '30 minutes'),
      (v_chen_contact_id, 'outbound', 'sms', 'Sale is now complete! Closing confirmed at $1,285,000. Proceeds to your lawyer Robert Fong. Congratulations David — fantastic result on this unit.', NOW() - INTERVAL '2 days'),
      (v_chen_contact_id, 'outbound', 'email', 'David, the sale of Unit 1808 at 1288 W Georgia St is officially closed at $1,285,000. This represents a strong return on your investment. Please let me know when you are ready to list your other units — happy to help maximize returns on those as well.', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
      (v_chen_contact_id, 'inbound', 'email', 'Great work! I am very happy with the result. Let us discuss listing the Cambie St unit next month. I will be in touch.', NOW() - INTERVAL '1 day');

    -- Update contact notes
    UPDATE contacts SET
      notes = 'Downtown Vancouver condo investor, owns 3 units. Sold Georgia St unit at $1.285M ($35K over asking). Planning to list Cambie St unit next month. High-value repeat client.'
    WHERE id = v_chen_contact_id;
  END IF;

  RAISE NOTICE 'Seller completed sales seed data inserted successfully!';
END $$;
