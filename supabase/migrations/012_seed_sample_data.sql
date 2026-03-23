-- 008: Seed realistic BC real estate demo data
-- Populates contacts, listings, deals, deal_parties, deal_checklist,
-- appointments, communications, tasks, and listing_documents

DO $$
DECLARE
  -- Contact IDs (sellers)
  c_sharma   UUID;
  c_chen     UUID;
  c_obrien   UUID;
  c_gill     UUID;
  c_wu       UUID;
  -- Contact IDs (buyers)
  c_torres   UUID;
  c_kim      UUID;
  c_patel    UUID;
  c_nguyen   UUID;
  c_park     UUID;
  -- Listing IDs
  l_kingsway   UUID;
  l_georgia    UUID;
  l_royal      UUID;
  l_assembly   UUID;
  l_osler      UUID;
  -- Deal IDs
  d_sharma_sell   UUID;  -- seller deal: listed
  d_chen_sell     UUID;  -- seller deal: showing
  d_obrien_sell   UUID;  -- seller deal: conditional
  d_wu_sell       UUID;  -- seller deal: closed (won)
  d_torres_buy    UUID;  -- buyer deal: new_lead
  d_kim_buy       UUID;  -- buyer deal: showing
  d_patel_buy     UUID;  -- buyer deal: offer
  d_nguyen_buy    UUID;  -- buyer deal: qualified (lost)
BEGIN

  ---------------------------------------------------------------
  -- CONTACTS (10: 5 sellers + 5 buyers)
  ---------------------------------------------------------------
  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Priya Sharma', '+16045551234', 'priya.sharma@gmail.com', 'seller', 'whatsapp', 'Selling Burnaby townhouse, relocating to Toronto')
  RETURNING id INTO c_sharma;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('David Chen', '+16045552345', 'david.chen@outlook.com', 'seller', 'sms', 'Downtown Vancouver condo investor, owns 3 units')
  RETURNING id INTO c_chen;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Margaret O''Brien', '+16045553456', 'margaret.obrien@shaw.ca', 'seller', 'sms', 'Downsizing from White Rock family home after 25 years')
  RETURNING id INTO c_obrien;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Harjit Gill', '+17785554567', 'harjit.gill@gmail.com', 'seller', 'whatsapp', 'Selling condo to upgrade to townhouse for growing family')
  RETURNING id INTO c_gill;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Jennifer Wu', '+16045555678', 'jennifer.wu@telus.net', 'seller', 'sms', 'Estate sale - recently inherited Kerrisdale property')
  RETURNING id INTO c_wu;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Michael Torres', '+17785556789', 'michael.torres@gmail.com', 'buyer', 'sms', 'First-time buyer, pre-approved for $750K, looking in Burnaby/New West')
  RETURNING id INTO c_torres;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Sarah & James Kim', '+16045557890', 'kim.family@gmail.com', 'buyer', 'whatsapp', 'Upgrading from condo to detached, school district priority')
  RETURNING id INTO c_kim;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Raj Patel', '+17785558901', 'raj.patel@hotmail.com', 'buyer', 'sms', 'Investor looking for rental properties in Metro Vancouver')
  RETURNING id INTO c_patel;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Emily Nguyen', '+16045559012', 'emily.nguyen@gmail.com', 'buyer', 'whatsapp', 'Relocating from Calgary, needs move-in ready by summer')
  RETURNING id INTO c_nguyen;

  INSERT INTO contacts (name, phone, email, type, pref_channel, notes)
  VALUES ('Andrew & Lisa Park', '+17785550123', 'parkfamily@outlook.com', 'buyer', 'sms', 'Downsizing from Langley to Vancouver condo, empty nesters')
  RETURNING id INTO c_park;

  ---------------------------------------------------------------
  -- LISTINGS (5 across statuses)
  ---------------------------------------------------------------
  INSERT INTO listings (address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes)
  VALUES ('4521 Kingsway, Burnaby, BC V5H 2A3', c_sharma, '4521', 'active', 'V1234567', 899900.00, '10:00', '18:00', '3BR/2BA townhouse, recently renovated kitchen, 2 parking')
  RETURNING id INTO l_kingsway;

  INSERT INTO listings (address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes)
  VALUES ('1808-1288 W Georgia St, Vancouver, BC V6E 4R3', c_chen, '1808', 'active', 'V2345678', 1250000.00, '09:00', '20:00', '2BR/2BA luxury condo, 18th floor, Coal Harbour views, concierge')
  RETURNING id INTO l_georgia;

  INSERT INTO listings (address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes)
  VALUES ('15234 Royal Ave, White Rock, BC V4B 1M3', c_obrien, '1523', 'pending', 'V3456789', 1675000.00, '11:00', '17:00', '4BR/3BA detached, ocean view, 8500 sqft lot, updated 2019')
  RETURNING id INTO l_royal;

  INSERT INTO listings (address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes)
  VALUES ('3205-4670 Assembly Way, Burnaby, BC V5H 4L7', c_gill, '3205', 'active', 'V4567890', 648500.00, '10:00', '19:00', '1BR+den, Station Square, steps to Metrotown SkyTrain')
  RETURNING id INTO l_assembly;

  INSERT INTO listings (address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes)
  VALUES ('8423 Osler St, Vancouver, BC V6P 4E1', c_wu, '8423', 'sold', 'V5678901', 2350000.00, '10:00', '17:00', '5BR/4BA Kerrisdale heritage home, sold $50K over asking')
  RETURNING id INTO l_osler;

  ---------------------------------------------------------------
  -- DEALS (8 across pipeline stages)
  ---------------------------------------------------------------

  -- Seller deals
  INSERT INTO deals (listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, notes, created_at)
  VALUES (l_kingsway, c_sharma, 'seller', 'listed', 'active',
    'Sharma - 4521 Kingsway Listing', 899900.00, 3.0, 26997.00,
    (CURRENT_DATE + INTERVAL '45 days')::DATE,
    'Just listed, expecting strong interest from first-time buyers',
    NOW() - INTERVAL '5 days')
  RETURNING id INTO d_sharma_sell;

  INSERT INTO deals (listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, notes, created_at)
  VALUES (l_georgia, c_chen, 'seller', 'showing', 'active',
    'Chen - 1288 W Georgia Listing', 1250000.00, 2.5, 31250.00,
    (CURRENT_DATE + INTERVAL '30 days')::DATE,
    'Multiple showings booked this week, 2 strong prospects',
    NOW() - INTERVAL '12 days')
  RETURNING id INTO d_chen_sell;

  INSERT INTO deals (listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, notes, created_at)
  VALUES (l_royal, c_obrien, 'seller', 'conditional', 'active',
    'O''Brien - 15234 Royal Ave Sale', 1675000.00, 3.5, 58625.00,
    (CURRENT_DATE + INTERVAL '21 days')::DATE,
    'Accepted offer $1.65M, subject removal Mar 28',
    NOW() - INTERVAL '20 days')
  RETURNING id INTO d_obrien_sell;

  INSERT INTO deals (listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, notes, created_at)
  VALUES (l_osler, c_wu, 'seller', 'closed', 'won',
    'Wu - 8423 Osler St SOLD', 2400000.00, 3.0, 72000.00,
    (CURRENT_DATE - INTERVAL '3 days')::DATE,
    'Sold $50K over asking! Multiple offers situation.',
    NOW() - INTERVAL '45 days')
  RETURNING id INTO d_wu_sell;

  -- Buyer deals
  INSERT INTO deals (contact_id, type, stage, status, title, value, commission_pct, commission_amount, notes, created_at)
  VALUES (c_torres, 'buyer', 'new_lead', 'active',
    'Torres - First-Time Buyer Search', 750000.00, 3.0, 22500.00,
    'Pre-approved with TD, looking for 2BR+ in Burnaby/New West',
    NOW() - INTERVAL '2 days')
  RETURNING id INTO d_torres_buy;

  INSERT INTO deals (listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, notes, created_at)
  VALUES (l_assembly, c_kim, 'buyer', 'showing', 'active',
    'Kim Family - Upgrade Search', 900000.00, 3.0, 27000.00,
    (CURRENT_DATE + INTERVAL '60 days')::DATE,
    'Viewing 3 properties this weekend including Assembly Way',
    NOW() - INTERVAL '8 days')
  RETURNING id INTO d_kim_buy;

  INSERT INTO deals (contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, subject_removal_date, notes, created_at)
  VALUES (c_patel, 'buyer', 'offer', 'active',
    'Patel - Investment Property', 680000.00, 2.5, 17000.00,
    (CURRENT_DATE + INTERVAL '35 days')::DATE,
    (CURRENT_DATE + INTERVAL '14 days')::DATE,
    'Submitted offer on Metrotown 1BR, waiting for response',
    NOW() - INTERVAL '15 days')
  RETURNING id INTO d_patel_buy;

  INSERT INTO deals (contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, lost_reason, notes, created_at)
  VALUES (c_nguyen, 'buyer', 'qualified', 'lost',
    'Nguyen - Relocation Purchase', 850000.00, 3.0, 25500.00,
    NULL,
    'Client decided to rent first and reassess in 6 months',
    'Was looking in East Van, couldn''t find right fit within budget. Will reconnect in fall.',
    NOW() - INTERVAL '25 days')
  RETURNING id INTO d_nguyen_buy;

  ---------------------------------------------------------------
  -- DEAL PARTIES (~18)
  ---------------------------------------------------------------

  -- Sharma deal parties
  INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
    (d_sharma_sell, 'seller_agent', 'You (Agent)', '+16045551000', 'agent@realtorcrm.ca', 'RE/MAX Crest Realty'),
    (d_sharma_sell, 'lawyer', 'Amandeep Sidhu', '+16045553100', 'asidhu@sidhulaw.ca', 'Sidhu & Associates');

  -- Chen deal parties
  INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
    (d_chen_sell, 'seller_agent', 'You (Agent)', '+16045551000', 'agent@realtorcrm.ca', 'RE/MAX Crest Realty'),
    (d_chen_sell, 'buyer_agent', 'Lisa Wang', '+16045553200', 'lisa.wang@royallepage.ca', 'Royal LePage Sussex'),
    (d_chen_sell, 'lawyer', 'Robert Fong', '+16045553201', 'rfong@fonglaw.ca', 'Fong & Partners LLP');

  -- O'Brien deal parties
  INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
    (d_obrien_sell, 'seller_agent', 'You (Agent)', '+16045551000', 'agent@realtorcrm.ca', 'RE/MAX Crest Realty'),
    (d_obrien_sell, 'buyer_agent', 'Kevin Brar', '+17785553300', 'kevin@suttongroup.com', 'Sutton Group West Coast'),
    (d_obrien_sell, 'inspector', 'Pacific Home Inspections', '+16045553301', 'info@pacificinspect.ca', 'Pacific Home Inspections Ltd'),
    (d_obrien_sell, 'lawyer', 'Diana Reeves', '+16045553302', 'dreeves@whiterocklaw.ca', 'White Rock Legal Services');

  -- Wu deal parties (closed)
  INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
    (d_wu_sell, 'seller_agent', 'You (Agent)', '+16045551000', 'agent@realtorcrm.ca', 'RE/MAX Crest Realty'),
    (d_wu_sell, 'buyer_agent', 'Mark Thompson', '+16045553400', 'mark.t@exprealty.com', 'eXp Realty BC'),
    (d_wu_sell, 'lawyer', 'Helen Chow', '+16045553401', 'hchow@chowlaw.ca', 'Chow & Associates'),
    (d_wu_sell, 'appraiser', 'BC Appraisal Group', '+16045553402', 'appraisals@bcag.ca', 'BC Appraisal Group Inc');

  -- Torres deal parties
  INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
    (d_torres_buy, 'buyer_agent', 'You (Agent)', '+16045551000', 'agent@realtorcrm.ca', 'RE/MAX Crest Realty'),
    (d_torres_buy, 'lender', 'Jessica Moore', '+16045553500', 'jessica.moore@td.com', 'TD Canada Trust');

  -- Kim deal parties
  INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
    (d_kim_buy, 'buyer_agent', 'You (Agent)', '+16045551000', 'agent@realtorcrm.ca', 'RE/MAX Crest Realty'),
    (d_kim_buy, 'lender', 'Arjun Dhillon', '+17785553600', 'arjun@dominionlending.ca', 'Dominion Lending Centres');

  -- Patel deal parties
  INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
    (d_patel_buy, 'buyer_agent', 'You (Agent)', '+16045551000', 'agent@realtorcrm.ca', 'RE/MAX Crest Realty'),
    (d_patel_buy, 'seller_agent', 'Nina Sandhu', '+16045553700', 'nina@macdonaldrealty.com', 'Macdonald Realty');

  ---------------------------------------------------------------
  -- DEAL CHECKLISTS
  -- Seller checklist for each seller deal, buyer for each buyer deal
  -- Mark items completed based on stage progression
  ---------------------------------------------------------------

  -- Sharma (listed) - first 4 items done
  INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
    (d_sharma_sell, 'Comparative market analysis', true, NOW() - INTERVAL '6 days', 0),
    (d_sharma_sell, 'Listing agreement signed', true, NOW() - INTERVAL '5 days', 1),
    (d_sharma_sell, 'Property photos taken', true, NOW() - INTERVAL '4 days', 2),
    (d_sharma_sell, 'MLS listing published', true, NOW() - INTERVAL '3 days', 3),
    (d_sharma_sell, 'Lockbox installed', false, NULL, 4),
    (d_sharma_sell, 'Open house scheduled', false, NULL, 5),
    (d_sharma_sell, 'Offer received', false, NULL, 6),
    (d_sharma_sell, 'Offer accepted', false, NULL, 7),
    (d_sharma_sell, 'Buyer conditions review', false, NULL, 8),
    (d_sharma_sell, 'Subjects removed', false, NULL, 9),
    (d_sharma_sell, 'Closing documents prepared', false, NULL, 10),
    (d_sharma_sell, 'Closing completed', false, NULL, 11),
    (d_sharma_sell, 'Possession transferred', false, NULL, 12);

  -- Chen (showing) - first 6 items done
  INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
    (d_chen_sell, 'Comparative market analysis', true, NOW() - INTERVAL '14 days', 0),
    (d_chen_sell, 'Listing agreement signed', true, NOW() - INTERVAL '13 days', 1),
    (d_chen_sell, 'Property photos taken', true, NOW() - INTERVAL '12 days', 2),
    (d_chen_sell, 'MLS listing published', true, NOW() - INTERVAL '11 days', 3),
    (d_chen_sell, 'Lockbox installed', true, NOW() - INTERVAL '10 days', 4),
    (d_chen_sell, 'Open house scheduled', true, NOW() - INTERVAL '8 days', 5),
    (d_chen_sell, 'Offer received', false, NULL, 6),
    (d_chen_sell, 'Offer accepted', false, NULL, 7),
    (d_chen_sell, 'Buyer conditions review', false, NULL, 8),
    (d_chen_sell, 'Subjects removed', false, NULL, 9),
    (d_chen_sell, 'Closing documents prepared', false, NULL, 10),
    (d_chen_sell, 'Closing completed', false, NULL, 11),
    (d_chen_sell, 'Possession transferred', false, NULL, 12);

  -- O'Brien (conditional) - first 9 items done
  INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
    (d_obrien_sell, 'Comparative market analysis', true, NOW() - INTERVAL '25 days', 0),
    (d_obrien_sell, 'Listing agreement signed', true, NOW() - INTERVAL '24 days', 1),
    (d_obrien_sell, 'Property photos taken', true, NOW() - INTERVAL '23 days', 2),
    (d_obrien_sell, 'MLS listing published', true, NOW() - INTERVAL '22 days', 3),
    (d_obrien_sell, 'Lockbox installed', true, NOW() - INTERVAL '21 days', 4),
    (d_obrien_sell, 'Open house scheduled', true, NOW() - INTERVAL '18 days', 5),
    (d_obrien_sell, 'Offer received', true, NOW() - INTERVAL '12 days', 6),
    (d_obrien_sell, 'Offer accepted', true, NOW() - INTERVAL '10 days', 7),
    (d_obrien_sell, 'Buyer conditions review', true, NOW() - INTERVAL '8 days', 8),
    (d_obrien_sell, 'Subjects removed', false, NULL, 9),
    (d_obrien_sell, 'Closing documents prepared', false, NULL, 10),
    (d_obrien_sell, 'Closing completed', false, NULL, 11),
    (d_obrien_sell, 'Possession transferred', false, NULL, 12);

  -- Wu (closed/won) - all 13 items done
  INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
    (d_wu_sell, 'Comparative market analysis', true, NOW() - INTERVAL '50 days', 0),
    (d_wu_sell, 'Listing agreement signed', true, NOW() - INTERVAL '48 days', 1),
    (d_wu_sell, 'Property photos taken', true, NOW() - INTERVAL '46 days', 2),
    (d_wu_sell, 'MLS listing published', true, NOW() - INTERVAL '45 days', 3),
    (d_wu_sell, 'Lockbox installed', true, NOW() - INTERVAL '44 days', 4),
    (d_wu_sell, 'Open house scheduled', true, NOW() - INTERVAL '40 days', 5),
    (d_wu_sell, 'Offer received', true, NOW() - INTERVAL '30 days', 6),
    (d_wu_sell, 'Offer accepted', true, NOW() - INTERVAL '28 days', 7),
    (d_wu_sell, 'Buyer conditions review', true, NOW() - INTERVAL '20 days', 8),
    (d_wu_sell, 'Subjects removed', true, NOW() - INTERVAL '14 days', 9),
    (d_wu_sell, 'Closing documents prepared', true, NOW() - INTERVAL '7 days', 10),
    (d_wu_sell, 'Closing completed', true, NOW() - INTERVAL '3 days', 11),
    (d_wu_sell, 'Possession transferred', true, NOW() - INTERVAL '3 days', 12);

  -- Torres (new_lead) - 1 item done
  INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
    (d_torres_buy, 'Pre-approval letter obtained', true, NOW() - INTERVAL '2 days', 0),
    (d_torres_buy, 'Property viewed', false, NULL, 1),
    (d_torres_buy, 'Offer submitted', false, NULL, 2),
    (d_torres_buy, 'Offer accepted', false, NULL, 3),
    (d_torres_buy, 'Home inspection scheduled', false, NULL, 4),
    (d_torres_buy, 'Home inspection completed', false, NULL, 5),
    (d_torres_buy, 'Appraisal ordered', false, NULL, 6),
    (d_torres_buy, 'Appraisal received', false, NULL, 7),
    (d_torres_buy, 'Subjects removed', false, NULL, 8),
    (d_torres_buy, 'Mortgage finalized', false, NULL, 9),
    (d_torres_buy, 'Title search completed', false, NULL, 10),
    (d_torres_buy, 'Closing documents signed', false, NULL, 11),
    (d_torres_buy, 'Keys received', false, NULL, 12);

  -- Kim (showing) - first 2 items done
  INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
    (d_kim_buy, 'Pre-approval letter obtained', true, NOW() - INTERVAL '10 days', 0),
    (d_kim_buy, 'Property viewed', true, NOW() - INTERVAL '5 days', 1),
    (d_kim_buy, 'Offer submitted', false, NULL, 2),
    (d_kim_buy, 'Offer accepted', false, NULL, 3),
    (d_kim_buy, 'Home inspection scheduled', false, NULL, 4),
    (d_kim_buy, 'Home inspection completed', false, NULL, 5),
    (d_kim_buy, 'Appraisal ordered', false, NULL, 6),
    (d_kim_buy, 'Appraisal received', false, NULL, 7),
    (d_kim_buy, 'Subjects removed', false, NULL, 8),
    (d_kim_buy, 'Mortgage finalized', false, NULL, 9),
    (d_kim_buy, 'Title search completed', false, NULL, 10),
    (d_kim_buy, 'Closing documents signed', false, NULL, 11),
    (d_kim_buy, 'Keys received', false, NULL, 12);

  -- Patel (offer) - first 3 items done
  INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
    (d_patel_buy, 'Pre-approval letter obtained', true, NOW() - INTERVAL '16 days', 0),
    (d_patel_buy, 'Property viewed', true, NOW() - INTERVAL '12 days', 1),
    (d_patel_buy, 'Offer submitted', true, NOW() - INTERVAL '4 days', 2),
    (d_patel_buy, 'Offer accepted', false, NULL, 3),
    (d_patel_buy, 'Home inspection scheduled', false, NULL, 4),
    (d_patel_buy, 'Home inspection completed', false, NULL, 5),
    (d_patel_buy, 'Appraisal ordered', false, NULL, 6),
    (d_patel_buy, 'Appraisal received', false, NULL, 7),
    (d_patel_buy, 'Subjects removed', false, NULL, 8),
    (d_patel_buy, 'Mortgage finalized', false, NULL, 9),
    (d_patel_buy, 'Title search completed', false, NULL, 10),
    (d_patel_buy, 'Closing documents signed', false, NULL, 11),
    (d_patel_buy, 'Keys received', false, NULL, 12);

  -- Nguyen (qualified/lost) - first 2 items done
  INSERT INTO deal_checklist (deal_id, item, completed, completed_at, sort_order) VALUES
    (d_nguyen_buy, 'Pre-approval letter obtained', true, NOW() - INTERVAL '28 days', 0),
    (d_nguyen_buy, 'Property viewed', true, NOW() - INTERVAL '22 days', 1),
    (d_nguyen_buy, 'Offer submitted', false, NULL, 2),
    (d_nguyen_buy, 'Offer accepted', false, NULL, 3),
    (d_nguyen_buy, 'Home inspection scheduled', false, NULL, 4),
    (d_nguyen_buy, 'Home inspection completed', false, NULL, 5),
    (d_nguyen_buy, 'Appraisal ordered', false, NULL, 6),
    (d_nguyen_buy, 'Appraisal received', false, NULL, 7),
    (d_nguyen_buy, 'Subjects removed', false, NULL, 8),
    (d_nguyen_buy, 'Mortgage finalized', false, NULL, 9),
    (d_nguyen_buy, 'Title search completed', false, NULL, 10),
    (d_nguyen_buy, 'Closing documents signed', false, NULL, 11),
    (d_nguyen_buy, 'Keys received', false, NULL, 12);

  ---------------------------------------------------------------
  -- APPOINTMENTS (10 showings across listings)
  ---------------------------------------------------------------
  INSERT INTO appointments (listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, notes) VALUES
    -- Kingsway (active) - 3 showings
    (l_kingsway, NOW() + INTERVAL '1 day' + INTERVAL '10 hours', NOW() + INTERVAL '1 day' + INTERVAL '10 hours 30 minutes', 'confirmed',
     'Lisa Wang', '+16045553200', 'lisa.wang@royallepage.ca', 'Buyers very interested in this area'),
    (l_kingsway, NOW() + INTERVAL '1 day' + INTERVAL '14 hours', NOW() + INTERVAL '1 day' + INTERVAL '14 hours 30 minutes', 'requested',
     'Tom Singh', '+17785554100', 'tom.singh@century21.ca', 'First-time buyers with young family'),
    (l_kingsway, NOW() + INTERVAL '3 days' + INTERVAL '11 hours', NOW() + INTERVAL '3 days' + INTERVAL '11 hours 30 minutes', 'confirmed',
     'Amy Zhang', '+16045554200', 'amy.zhang@remax.ca', NULL),

    -- Georgia (active) - 3 showings
    (l_georgia, NOW() + INTERVAL '2 days' + INTERVAL '13 hours', NOW() + INTERVAL '2 days' + INTERVAL '13 hours 30 minutes', 'confirmed',
     'Kevin Brar', '+17785553300', 'kevin@suttongroup.com', 'Investor client, cash offer possible'),
    (l_georgia, NOW() - INTERVAL '2 days' + INTERVAL '15 hours', NOW() - INTERVAL '2 days' + INTERVAL '15 hours 30 minutes', 'cancelled',
     'Maria Lopez', '+16045554300', 'maria@remax.ca', 'Buyer found another property'),
    (l_georgia, NOW() + INTERVAL '4 days' + INTERVAL '10 hours', NOW() + INTERVAL '4 days' + INTERVAL '10 hours 30 minutes', 'requested',
     'James Park', '+16045554400', 'james.park@exprealty.com', 'Downsizing couple'),

    -- Royal Ave (pending) - 2 showings (past, before offer accepted)
    (l_royal, NOW() - INTERVAL '15 days' + INTERVAL '11 hours', NOW() - INTERVAL '15 days' + INTERVAL '11 hours 30 minutes', 'confirmed',
     'Kevin Brar', '+17785553300', 'kevin@suttongroup.com', 'Successful showing, led to offer'),
    (l_royal, NOW() - INTERVAL '18 days' + INTERVAL '14 hours', NOW() - INTERVAL '18 days' + INTERVAL '14 hours 30 minutes', 'denied',
     'Sarah Lee', '+16045554500', 'sarah.lee@sothebys.com', 'Seller was not available that day'),

    -- Assembly Way (active) - 2 showings
    (l_assembly, NOW() + INTERVAL '2 days' + INTERVAL '16 hours', NOW() + INTERVAL '2 days' + INTERVAL '16 hours 30 minutes', 'confirmed',
     'Nina Sandhu', '+16045553700', 'nina@macdonaldrealty.com', 'Investor client comparing units'),
    (l_assembly, NOW() + INTERVAL '5 days' + INTERVAL '12 hours', NOW() + INTERVAL '5 days' + INTERVAL '12 hours 30 minutes', 'requested',
     'Ryan Chen', '+17785554600', 'ryan.chen@remax.ca', 'Looking for rental investment');

  ---------------------------------------------------------------
  -- COMMUNICATIONS (24 messages)
  ---------------------------------------------------------------

  -- Sharma communications (WhatsApp)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_sharma, 'outbound', 'whatsapp', 'Hi Priya! Your listing at 4521 Kingsway is now live on MLS. Photos look great! I''ll keep you updated on showing requests.', NOW() - INTERVAL '3 days'),
    (c_sharma, 'inbound', 'whatsapp', 'Wonderful, thank you! How many views has it gotten so far?', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
    (c_sharma, 'outbound', 'whatsapp', 'Already 45 views online and 3 showing requests! Very promising start for the first week.', NOW() - INTERVAL '3 days' + INTERVAL '3 hours');

  -- Chen communications (SMS)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_chen, 'outbound', 'sms', 'David, we have 3 showings booked for your Georgia St condo this week. Tuesday, Thursday, and Saturday.', NOW() - INTERVAL '4 days'),
    (c_chen, 'inbound', 'sms', 'Great. Any feedback from the open house last weekend?', NOW() - INTERVAL '4 days' + INTERVAL '1 hour'),
    (c_chen, 'outbound', 'sms', 'Very positive! Two couples mentioned they''d be submitting offers. I''ll follow up with their agents today.', NOW() - INTERVAL '4 days' + INTERVAL '2 hours');

  -- O'Brien communications (SMS + email)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_obrien, 'outbound', 'email', 'Margaret, I''m pleased to inform you that we''ve received a strong offer of $1.65M on your Royal Ave property. The buyer is pre-approved and requesting a 21-day close. I recommend we accept with standard subject conditions.', NOW() - INTERVAL '10 days'),
    (c_obrien, 'inbound', 'sms', 'That sounds wonderful! Let''s go ahead and accept. When can we sign?', NOW() - INTERVAL '10 days' + INTERVAL '3 hours'),
    (c_obrien, 'outbound', 'sms', 'I''ll prepare the acceptance documents today. Can we meet at my office tomorrow at 2pm to sign?', NOW() - INTERVAL '10 days' + INTERVAL '4 hours');

  -- Wu communications (email)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_wu, 'outbound', 'email', 'Jennifer, congratulations! The sale of 8423 Osler St has officially closed. The proceeds have been sent to your lawyer''s trust account. Thank you for trusting me with this sale.', NOW() - INTERVAL '3 days'),
    (c_wu, 'inbound', 'email', 'Thank you so much for everything. The price exceeded our expectations. I''ll be sure to recommend you to friends and family.', NOW() - INTERVAL '2 days');

  -- Torres communications (SMS)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_torres, 'inbound', 'sms', 'Hi, I was referred by a colleague. I''m looking to buy my first home in Burnaby or New West. Pre-approved for $750K with TD.', NOW() - INTERVAL '2 days'),
    (c_torres, 'outbound', 'sms', 'Welcome Michael! I''d love to help you find your first home. Let''s set up a call this week to discuss your wishlist. What times work for you?', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
    (c_torres, 'inbound', 'sms', 'Thursday after 5pm works best for me.', NOW() - INTERVAL '2 days' + INTERVAL '2 hours');

  -- Kim communications (WhatsApp)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_kim, 'outbound', 'whatsapp', 'Sarah, I''ve shortlisted 5 properties that match your criteria. All in good school catchments with 3+ bedrooms. Can we tour this weekend?', NOW() - INTERVAL '6 days'),
    (c_kim, 'inbound', 'whatsapp', 'Saturday morning works perfectly! James can come too. We''re excited to see them.', NOW() - INTERVAL '6 days' + INTERVAL '4 hours');

  -- Patel communications (SMS)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_patel, 'outbound', 'sms', 'Raj, I submitted your offer of $680K on the Metrotown unit. The listing agent confirmed they''ll present to the seller by end of day.', NOW() - INTERVAL '4 days'),
    (c_patel, 'inbound', 'sms', 'Thanks. Let me know as soon as you hear back. I''m ready to move quickly if they counter.', NOW() - INTERVAL '4 days' + INTERVAL '30 minutes');

  -- Nguyen communications (WhatsApp + note)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_nguyen, 'inbound', 'whatsapp', 'Hi, I''ve been thinking about it and I think we''re going to hold off on buying for now. The market feels too competitive and we''d rather rent first.', NOW() - INTERVAL '25 days'),
    (c_nguyen, 'outbound', 'whatsapp', 'I completely understand Emily. The market can be overwhelming, especially with a relocation. I''ll keep an eye out for you and we can reconnect when you''re ready.', NOW() - INTERVAL '25 days' + INTERVAL '1 hour');

  -- Park communications (SMS)
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_park, 'outbound', 'sms', 'Andrew & Lisa, I found some great downtown condos that match what you described. Ranging from $650K-$850K with 2BR minimum. Want to set up viewings?', NOW() - INTERVAL '1 day'),
    (c_park, 'inbound', 'sms', 'Yes please! We''re available next week. We prefer something with a view if possible.', NOW() - INTERVAL '1 day' + INTERVAL '3 hours');

  -- Agent notes
  INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
    (c_gill, 'outbound', 'note', 'Harjit mentioned he wants to list at $648K firm, no flexibility. Assembly Way condo has good strata minutes, no special levies upcoming.', NOW() - INTERVAL '7 days'),
    (c_nguyen, 'outbound', 'note', 'Follow up with Emily in September. She mentioned potentially being ready to buy in fall once settled in Vancouver.', NOW() - INTERVAL '24 days');

  ---------------------------------------------------------------
  -- TASKS (15 across categories and statuses)
  ---------------------------------------------------------------
  INSERT INTO tasks (title, description, status, priority, category, due_date, contact_id, listing_id, completed_at) VALUES
    -- Completed (3)
    ('Prepare CMA for Sharma listing', 'Run comparable analysis for 4521 Kingsway area', 'completed', 'high', 'listing', (CURRENT_DATE - INTERVAL '6 days')::DATE, c_sharma, l_kingsway, NOW() - INTERVAL '6 days'),
    ('Upload photos to MLS', 'Professional photos received, upload to MLS and website', 'completed', 'high', 'listing', (CURRENT_DATE - INTERVAL '3 days')::DATE, c_chen, l_georgia, NOW() - INTERVAL '4 days'),
    ('Send welcome package to Torres', 'Email buyer guide, pre-approval checklist, and neighbourhood guides', 'completed', 'medium', 'follow_up', (CURRENT_DATE - INTERVAL '1 day')::DATE, c_torres, NULL, NOW() - INTERVAL '1 day'),

    -- In Progress (2)
    ('Schedule home inspection for O''Brien sale', 'Buyer requested Pacific Home Inspections, confirm availability', 'in_progress', 'urgent', 'inspection', (CURRENT_DATE + INTERVAL '3 days')::DATE, c_obrien, l_royal, NULL),
    ('Prepare showing schedule for Kim family', 'Coordinate 5 property viewings for Saturday', 'in_progress', 'high', 'showing', (CURRENT_DATE + INTERVAL '1 day')::DATE, c_kim, NULL, NULL),

    -- Pending (10)
    ('Follow up with Torres on wishlist call', 'Call Thursday after 5pm to discuss property requirements', 'pending', 'high', 'follow_up', (CURRENT_DATE + INTERVAL '2 days')::DATE, c_torres, NULL, NULL),
    ('Order title search for O''Brien property', 'Title search needed before closing', 'pending', 'urgent', 'document', (CURRENT_DATE + INTERVAL '5 days')::DATE, c_obrien, l_royal, NULL),
    ('Install lockbox at Kingsway', 'Coordinate with Sharma for lockbox installation', 'pending', 'medium', 'listing', (CURRENT_DATE + INTERVAL '1 day')::DATE, c_sharma, l_kingsway, NULL),
    ('Create marketing flyer for Assembly Way', 'Design single-page flyer for open house', 'pending', 'medium', 'marketing', (CURRENT_DATE + INTERVAL '7 days')::DATE, c_gill, l_assembly, NULL),
    ('Review strata minutes for Assembly Way', 'Check last 2 years of strata minutes for issues', 'pending', 'medium', 'document', (CURRENT_DATE + INTERVAL '4 days')::DATE, c_gill, l_assembly, NULL),
    ('Send Park family condo shortlist', 'Compile list of 2BR downtown condos with views $650K-$850K', 'pending', 'medium', 'follow_up', (CURRENT_DATE + INTERVAL '2 days')::DATE, c_park, NULL, NULL),
    ('Coordinate possession date with Wu buyer', 'Confirm possession transfer details with buyer agent Mark Thompson', 'pending', 'low', 'closing', (CURRENT_DATE + INTERVAL '3 days')::DATE, c_wu, l_osler, NULL),
    ('Follow up with Patel on offer status', 'Check with listing agent Nina Sandhu for seller response', 'pending', 'high', 'follow_up', (CURRENT_DATE + INTERVAL '1 day')::DATE, c_patel, NULL, NULL),
    ('Schedule open house for Kingsway', 'Plan first open house for upcoming weekend', 'pending', 'medium', 'showing', (CURRENT_DATE + INTERVAL '5 days')::DATE, c_sharma, l_kingsway, NULL),
    ('Reconnect with Nguyen in September', 'Emily asked to reassess buying in fall', 'pending', 'low', 'follow_up', (CURRENT_DATE + INTERVAL '180 days')::DATE, c_nguyen, NULL, NULL);

  ---------------------------------------------------------------
  -- LISTING DOCUMENTS (11 across listings)
  ---------------------------------------------------------------
  INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
    -- Kingsway
    (l_kingsway, 'FINTRAC', 'Sharma_FINTRAC_Individual.pdf', '/documents/kingsway/fintrac.pdf'),
    (l_kingsway, 'CONTRACT', 'Sharma_Listing_Agreement.pdf', '/documents/kingsway/listing_agreement.pdf'),

    -- Georgia
    (l_georgia, 'FINTRAC', 'Chen_FINTRAC_Individual.pdf', '/documents/georgia/fintrac.pdf'),
    (l_georgia, 'PDS', 'Chen_Property_Disclosure.pdf', '/documents/georgia/pds.pdf'),
    (l_georgia, 'CONTRACT', 'Chen_Listing_Agreement.pdf', '/documents/georgia/listing_agreement.pdf'),

    -- Royal Ave
    (l_royal, 'FINTRAC', 'OBrien_FINTRAC_Individual.pdf', '/documents/royal/fintrac.pdf'),
    (l_royal, 'PDS', 'OBrien_Property_Disclosure.pdf', '/documents/royal/pds.pdf'),
    (l_royal, 'CONTRACT', 'OBrien_Listing_Agreement.pdf', '/documents/royal/listing_agreement.pdf'),
    (l_royal, 'DORTS', 'OBrien_DORTS.pdf', '/documents/royal/dorts.pdf'),

    -- Osler
    (l_osler, 'FINTRAC', 'Wu_FINTRAC_Individual.pdf', '/documents/osler/fintrac.pdf'),
    (l_osler, 'CONTRACT', 'Wu_Purchase_Contract.pdf', '/documents/osler/purchase_contract.pdf');

  RAISE NOTICE 'Seed data inserted successfully!';
END $$;
