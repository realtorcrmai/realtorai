-- 012: Seed family members, important dates, open houses, visitors, and listing activities
-- Adds demo data for the new Contact Family/Dates, Open House, and Listing Stats features

DO $$
DECLARE
  -- Contact IDs
  v_contact_id UUID;
  v_family_id UUID;
  -- Listing IDs
  v_listing_id UUID;
  v_oh_id UUID;
BEGIN

  -- ===============================================================
  -- CONTACT FAMILY MEMBERS + IMPORTANT DATES
  -- ===============================================================

  -- Priya Sharma — spouse + child
  SELECT id INTO v_contact_id FROM contacts WHERE name = 'Priya Sharma' LIMIT 1;
  IF v_contact_id IS NOT NULL THEN
    INSERT INTO contact_family_members (contact_id, name, relationship, phone, email, notes)
    VALUES (v_contact_id, 'Vikram Sharma', 'spouse', '+16045551235', 'vikram.sharma@gmail.com', 'Works at BCIT, handles finances')
    RETURNING id INTO v_family_id;
    INSERT INTO contact_important_dates (contact_id, family_member_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, v_family_id, 'birthday', '1985-06-15', 'Vikram''s Birthday', true, 7);

    INSERT INTO contact_family_members (contact_id, name, relationship, notes)
    VALUES (v_contact_id, 'Anaya Sharma', 'child', 'Age 8, attends Burnaby Central Elementary')
    RETURNING id INTO v_family_id;
    INSERT INTO contact_important_dates (contact_id, family_member_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, v_family_id, 'birthday', '2018-03-22', 'Anaya''s Birthday', true, 7);

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'anniversary', '2012-08-10', 'Wedding Anniversary', true, 14);

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'birthday', '1987-11-03', 'Priya''s Birthday', true, 7);
  END IF;

  -- David Chen — partner
  SELECT id INTO v_contact_id FROM contacts WHERE name = 'David Chen' LIMIT 1;
  IF v_contact_id IS NOT NULL THEN
    INSERT INTO contact_family_members (contact_id, name, relationship, phone, email)
    VALUES (v_contact_id, 'Michelle Tan', 'spouse', '+16045552346', 'michelle.tan@outlook.com')
    RETURNING id INTO v_family_id;
    INSERT INTO contact_important_dates (contact_id, family_member_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, v_family_id, 'birthday', '1990-09-18', 'Michelle''s Birthday', true, 7);

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'birthday', '1988-04-25', 'David''s Birthday', true, 7);
  END IF;

  -- Margaret O'Brien — two adult children
  SELECT id INTO v_contact_id FROM contacts WHERE name = 'Margaret O''Brien' LIMIT 1;
  IF v_contact_id IS NOT NULL THEN
    INSERT INTO contact_family_members (contact_id, name, relationship, phone, notes)
    VALUES (v_contact_id, 'Sean O''Brien', 'child', '+16045553457', 'Lives in North Vancouver, helps mom with move')
    RETURNING id INTO v_family_id;

    INSERT INTO contact_family_members (contact_id, name, relationship, phone, email)
    VALUES (v_contact_id, 'Katie O''Brien-Walsh', 'child', '+17785553458', 'katie.walsh@gmail.com')
    RETURNING id INTO v_family_id;

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'birthday', '1958-12-01', 'Margaret''s Birthday', true, 14);

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'closing_anniversary', '2000-05-15', 'Home Purchase Anniversary', true, 30);
  END IF;

  -- Sarah & James Kim — two kids
  SELECT id INTO v_contact_id FROM contacts WHERE name = 'Sarah & James Kim' LIMIT 1;
  IF v_contact_id IS NOT NULL THEN
    INSERT INTO contact_family_members (contact_id, name, relationship, notes)
    VALUES (v_contact_id, 'Ethan Kim', 'child', 'Age 6, starting Grade 1 in Sept')
    RETURNING id INTO v_family_id;
    INSERT INTO contact_important_dates (contact_id, family_member_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, v_family_id, 'birthday', '2020-01-14', 'Ethan''s Birthday', true, 7);

    INSERT INTO contact_family_members (contact_id, name, relationship, notes)
    VALUES (v_contact_id, 'Mia Kim', 'child', 'Age 3, in daycare')
    RETURNING id INTO v_family_id;

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'anniversary', '2017-06-20', 'Kim Wedding Anniversary', true, 14);
  END IF;

  -- Raj Patel — parents
  SELECT id INTO v_contact_id FROM contacts WHERE name = 'Raj Patel' LIMIT 1;
  IF v_contact_id IS NOT NULL THEN
    INSERT INTO contact_family_members (contact_id, name, relationship, phone, notes)
    VALUES (v_contact_id, 'Meera Patel', 'parent', '+17785558902', 'Mother, co-signer on investment property');

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'birthday', '1992-07-08', 'Raj''s Birthday', true, 7);
  END IF;

  -- Emily Nguyen — sibling
  SELECT id INTO v_contact_id FROM contacts WHERE name = 'Emily Nguyen' LIMIT 1;
  IF v_contact_id IS NOT NULL THEN
    INSERT INTO contact_family_members (contact_id, name, relationship, phone, email, notes)
    VALUES (v_contact_id, 'Kevin Nguyen', 'sibling', '+14035559013', 'kevin.nguyen@gmail.com', 'Brother in Calgary, helping with relocation')
    RETURNING id INTO v_family_id;

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'birthday', '1994-10-30', 'Emily''s Birthday', true, 7);

    INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before)
    VALUES (v_contact_id, 'move_in', '2026-06-01', 'Target Move-in Date', false, 30);
  END IF;

  -- ===============================================================
  -- OPEN HOUSES (for active/pending listings)
  -- ===============================================================

  -- Kingsway listing — 2 open houses
  SELECT id INTO v_listing_id FROM listings WHERE address LIKE '%Kingsway%' LIMIT 1;
  IF v_listing_id IS NOT NULL THEN
    INSERT INTO open_houses (listing_id, date, start_time, end_time, type, status, notes, visitor_count)
    VALUES (v_listing_id, (NOW() - INTERVAL '7 days')::date, '14:00:00', '16:00:00', 'public', 'completed', 'Good turnout, 3 serious buyers', 12)
    RETURNING id INTO v_oh_id;

    INSERT INTO open_house_visitors (open_house_id, name, phone, email, interest_level, feedback, wants_followup)
    VALUES
      (v_oh_id, 'Daniel Lee', '+16045559100', 'daniel.lee@gmail.com', 'hot', 'Loves the layout, wants second viewing', true),
      (v_oh_id, 'Anna Petrova', '+17785559101', NULL, 'warm', 'Concerned about traffic noise', true),
      (v_oh_id, 'Mark & Jenny Adams', '+16045559102', 'adams.mark@outlook.com', 'warm', 'Looking for something with a bigger yard', false),
      (v_oh_id, 'Grace Huang', NULL, 'grace.h@gmail.com', 'cold', NULL, false);

    INSERT INTO open_houses (listing_id, date, start_time, end_time, type, status, notes, visitor_count)
    VALUES (v_listing_id, (NOW() + INTERVAL '3 days')::date, '13:00:00', '15:00:00', 'public', 'scheduled', 'Advertised on MLS and social media', 0);

    -- Listing activities for Kingsway
    INSERT INTO listing_activities (listing_id, activity_type, description, source) VALUES
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'Realtor.ca view', 'Realtor.ca'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'Facebook ad click', 'Facebook'),
      (v_listing_id, 'inquiry', 'Phone inquiry about parking', 'Phone'),
      (v_listing_id, 'inquiry', 'Email inquiry about strata fees', 'Email'),
      (v_listing_id, 'showing', 'Showing with buyer agent Daniel Cho', 'Agent'),
      (v_listing_id, 'showing', 'Showing with buyer agent Lisa Wang', 'Agent'),
      (v_listing_id, 'open_house', 'Public open house completed', 'Open House'),
      (v_listing_id, 'offer', 'Verbal offer indication from Daniel Lee', 'Agent');
  END IF;

  -- Georgia St listing — 1 broker open
  SELECT id INTO v_listing_id FROM listings WHERE address LIKE '%Georgia%' LIMIT 1;
  IF v_listing_id IS NOT NULL THEN
    INSERT INTO open_houses (listing_id, date, start_time, end_time, type, status, notes, visitor_count)
    VALUES (v_listing_id, (NOW() - INTERVAL '3 days')::date, '11:00:00', '13:00:00', 'broker', 'completed', 'Broker open for Westside agents', 8)
    RETURNING id INTO v_oh_id;

    INSERT INTO open_house_visitors (open_house_id, name, phone, agent_name, interest_level, wants_followup)
    VALUES
      (v_oh_id, 'Agent: Sarah Miller', '+16045559200', 'Sarah Miller - RE/MAX', 'warm', true),
      (v_oh_id, 'Agent: Tom Nakamura', '+17785559201', 'Tom Nakamura - Sutton', 'hot', true),
      (v_oh_id, 'Agent: Amy Chen', '+16045559202', 'Amy Chen - Royal LePage', 'warm', false);

    INSERT INTO open_houses (listing_id, date, start_time, end_time, type, status, visitor_count)
    VALUES (v_listing_id, (NOW() + INTERVAL '5 days')::date, '14:00:00', '16:00:00', 'public', 'scheduled', 0);

    -- Listing activities for Georgia
    INSERT INTO listing_activities (listing_id, activity_type, description, source) VALUES
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'Realtor.ca view', 'Realtor.ca'),
      (v_listing_id, 'inquiry', 'Email from offshore buyer re: pricing', 'Email'),
      (v_listing_id, 'showing', 'Showing with Agent Tom Nakamura', 'Agent'),
      (v_listing_id, 'open_house', 'Broker open house completed', 'Open House'),
      (v_listing_id, 'price_change', 'Price reduced from $1,295,000 to $1,250,000', 'Agent');
  END IF;

  -- Royal Ave listing (pending) — 1 completed open house
  SELECT id INTO v_listing_id FROM listings WHERE address LIKE '%Royal%' LIMIT 1;
  IF v_listing_id IS NOT NULL THEN
    INSERT INTO open_houses (listing_id, date, start_time, end_time, type, status, notes, visitor_count)
    VALUES (v_listing_id, (NOW() - INTERVAL '14 days')::date, '13:00:00', '16:00:00', 'public', 'completed', 'Great interest from local families', 18)
    RETURNING id INTO v_oh_id;

    INSERT INTO open_house_visitors (open_house_id, name, phone, email, interest_level, feedback, wants_followup)
    VALUES
      (v_oh_id, 'Robert & Diane Fraser', '+16045559300', 'fraser.family@shaw.ca', 'hot', 'Love the ocean view, may submit offer', true),
      (v_oh_id, 'Yuki Tanaka', '+17785559301', 'yuki.t@gmail.com', 'hot', 'Already pre-approved, very interested', true),
      (v_oh_id, 'Steve Morrison', '+16045559302', NULL, 'warm', 'Comparing with similar homes in area', true),
      (v_oh_id, 'Cathy & Paul Wilson', '+16045559303', 'wilson.cp@outlook.com', 'warm', NULL, false),
      (v_oh_id, 'Linda Park', NULL, 'linda.park@gmail.com', 'cold', 'Just browsing', false);

    INSERT INTO listing_activities (listing_id, activity_type, description, source) VALUES
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'Realtor.ca view', 'Realtor.ca'),
      (v_listing_id, 'view', 'Realtor.ca view', 'Realtor.ca'),
      (v_listing_id, 'view', 'Instagram story click', 'Instagram'),
      (v_listing_id, 'inquiry', 'Phone inquiry about schools nearby', 'Phone'),
      (v_listing_id, 'inquiry', 'Email inquiry about lot size', 'Email'),
      (v_listing_id, 'inquiry', 'WhatsApp message about viewing', 'WhatsApp'),
      (v_listing_id, 'showing', 'Showing with buyer agent Kim Lee', 'Agent'),
      (v_listing_id, 'showing', 'Showing with buyer agent Marco Silva', 'Agent'),
      (v_listing_id, 'showing', 'Showing with Robert & Diane Fraser', 'Agent'),
      (v_listing_id, 'open_house', 'Public open house — 18 visitors', 'Open House'),
      (v_listing_id, 'offer', 'Offer submitted by Yuki Tanaka at $1,650,000', 'Agent'),
      (v_listing_id, 'offer', 'Counter-offer sent at $1,670,000', 'Agent');
  END IF;

  -- Assembly Way listing — 1 scheduled
  SELECT id INTO v_listing_id FROM listings WHERE address LIKE '%Assembly%' LIMIT 1;
  IF v_listing_id IS NOT NULL THEN
    INSERT INTO open_houses (listing_id, date, start_time, end_time, type, status, notes, visitor_count)
    VALUES (v_listing_id, (NOW() + INTERVAL '7 days')::date, '14:00:00', '16:00:00', 'public', 'scheduled', 'First open house for this listing', 0);

    INSERT INTO listing_activities (listing_id, activity_type, description, source) VALUES
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'Realtor.ca view', 'Realtor.ca'),
      (v_listing_id, 'inquiry', 'Email inquiry about move-in date', 'Email'),
      (v_listing_id, 'showing', 'Showing with buyer agent Preet Singh', 'Agent');
  END IF;

  -- Osler St listing (sold) — past open house data
  SELECT id INTO v_listing_id FROM listings WHERE address LIKE '%Osler%' LIMIT 1;
  IF v_listing_id IS NOT NULL THEN
    INSERT INTO open_houses (listing_id, date, start_time, end_time, type, status, notes, visitor_count)
    VALUES (v_listing_id, (NOW() - INTERVAL '45 days')::date, '13:00:00', '16:00:00', 'public', 'completed', 'Massive turnout for Kerrisdale property', 25)
    RETURNING id INTO v_oh_id;

    INSERT INTO open_house_visitors (open_house_id, name, phone, interest_level, feedback, wants_followup)
    VALUES
      (v_oh_id, 'Victor & Helen Chang', '+16045559400', 'hot', 'Submitted offer same day', true),
      (v_oh_id, 'Natasha Volkov', '+17785559401', 'hot', 'Very interested, competing offer', true),
      (v_oh_id, 'James Whitfield', '+16045559402', 'warm', 'Likes the character home style', false);

    INSERT INTO listing_activities (listing_id, activity_type, description, source) VALUES
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'MLS listing viewed', 'MLS'),
      (v_listing_id, 'view', 'Realtor.ca view', 'Realtor.ca'),
      (v_listing_id, 'view', 'Realtor.ca view', 'Realtor.ca'),
      (v_listing_id, 'view', 'Realtor.ca view', 'Realtor.ca'),
      (v_listing_id, 'view', 'Facebook ad click', 'Facebook'),
      (v_listing_id, 'inquiry', 'Phone call from offshore investor', 'Phone'),
      (v_listing_id, 'inquiry', 'Email inquiry about heritage designation', 'Email'),
      (v_listing_id, 'inquiry', 'WhatsApp from previous client referral', 'WhatsApp'),
      (v_listing_id, 'showing', 'Showing with Victor & Helen Chang', 'Agent'),
      (v_listing_id, 'showing', 'Showing with Natasha Volkov', 'Agent'),
      (v_listing_id, 'showing', 'Showing with James Whitfield', 'Agent'),
      (v_listing_id, 'showing', 'Second showing with Victor & Helen Chang', 'Agent'),
      (v_listing_id, 'open_house', 'Public open house — 25 visitors', 'Open House'),
      (v_listing_id, 'offer', 'Offer from Victor & Helen Chang at $2,300,000', 'Agent'),
      (v_listing_id, 'offer', 'Competing offer from Natasha Volkov at $2,325,000', 'Agent'),
      (v_listing_id, 'offer', 'Final accepted offer at $2,350,000', 'Agent');
  END IF;

END $$;
