-- ============================================================
-- Migration 019: Reset all seed data with logically consistent scenarios
-- ============================================================
-- Covers 7 listing scenarios at different workflow stages:
--   1. SOLD   — fully completed, all forms done, closed deal
--   2. SOLD   — luxury sale, over asking, all complete
--   3. ACTIVE — mid-workflow (Phase 5: forms in progress), has showings
--   4. ACTIVE — early workflow (Phase 2: enrichment), just listed
--   5. ACTIVE — Phase 7 (MLS prep), ready to go live
--   6. PENDING — offer accepted, subject removal pending
--   7. ACTIVE — brand new listing, Phase 1 intake just started
-- ============================================================

-- ===================
-- CLEAR ALL DATA (respects FK order)
-- ===================
DELETE FROM open_house_visitors;
DELETE FROM open_houses;
DELETE FROM listing_activities;
DELETE FROM listing_documents;
DELETE FROM media_assets;
DELETE FROM prompts;
DELETE FROM form_submissions;
DELETE FROM deal_checklist;
DELETE FROM deal_parties;
DELETE FROM mortgages;
DELETE FROM communications;
DELETE FROM appointments;
DELETE FROM tasks;
DELETE FROM deals;
DELETE FROM contact_important_dates;
DELETE FROM contact_family_members;
DELETE FROM listings;
DELETE FROM contacts;

-- ===================
-- CONTACTS (8 sellers, 5 buyers = 13 total)
-- ===================

-- Sellers
INSERT INTO contacts (id, name, phone, email, type, pref_channel, notes, created_at) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Priya Sharma',        '+16045551234', 'priya.sharma@gmail.com',       'seller', 'whatsapp', 'Long-time client. Owns condo in Burnaby. Relocating to Toronto for work.', NOW() - INTERVAL '60 days'),
  ('c0000001-0000-0000-0000-000000000002', 'David Chen',           '+16045552345', 'david.chen@outlook.com',       'seller', 'sms',      'Downtown Vancouver investor. Owns 3 units. Sold Georgia St unit at $1.285M.', NOW() - INTERVAL '90 days'),
  ('c0000001-0000-0000-0000-000000000003', 'Margaret O''Brien',    '+16045553456', 'margaret.obrien@shaw.ca',      'seller', 'sms',      'Retired teacher. Downsizing from White Rock family home after 28 years.', NOW() - INTERVAL '75 days'),
  ('c0000001-0000-0000-0000-000000000004', 'Harjit & Gurpreet Gill', '+17785554567', 'harjit.gill@gmail.com',     'seller', 'sms',      'Young couple. First time selling. Assembly Way condo — upgrading to townhouse.', NOW() - INTERVAL '30 days'),
  ('c0000001-0000-0000-0000-000000000005', 'Jennifer Wu',          '+16045555678', 'jennifer.wu@telus.net',        'seller', 'whatsapp', 'Kerrisdale homeowner. Estate sale — inherited property from parents.', NOW() - INTERVAL '120 days'),
  ('c0000001-0000-0000-0000-000000000006', 'Robert & Anna Kovacs', '+16045559400', 'kovacs.ra@gmail.com',          'seller', 'sms',      'Selling Yaletown condo. Moving to Kelowna for retirement.', NOW() - INTERVAL '45 days'),
  ('c0000001-0000-0000-0000-000000000007', 'Amandeep Singh',       '+17785557890', 'amandeep.singh@hotmail.com',   'seller', 'whatsapp', 'Surrey townhouse owner. Just started listing process.', NOW() - INTERVAL '3 days'),
  ('c0000001-0000-0000-0000-000000000008', 'Lisa Tanaka',          '+16045558901', 'lisa.tanaka@gmail.com',        'seller', 'sms',      'North Vancouver. Listing ready for MLS — all forms signed.', NOW() - INTERVAL '20 days');

-- Buyers
INSERT INTO contacts (id, name, phone, email, type, pref_channel, notes, created_at) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'Michael Torres',       '+16045556789', 'michael.torres@gmail.com',     'buyer', 'sms',      'First-time buyer. Pre-approved $650K. Looking in Burnaby/New West.', NOW() - INTERVAL '45 days'),
  ('c0000002-0000-0000-0000-000000000002', 'Sarah & James Kim',    '+17785550123', 'kim.family@outlook.com',       'buyer', 'sms',      'Growing family. Purchased 2845 Triumph St. Happy clients — referral source.', NOW() - INTERVAL '80 days'),
  ('c0000002-0000-0000-0000-000000000003', 'Raj Patel',            '+16045550456', 'raj.patel@gmail.com',          'buyer', 'whatsapp', 'Investment buyer. Purchased rental property on Kingsway. Looking for more.', NOW() - INTERVAL '70 days'),
  ('c0000002-0000-0000-0000-000000000004', 'Emily Nguyen',         '+16045559012', 'emily.nguyen@gmail.com',       'buyer', 'whatsapp', 'Downsizer from North Van. Interested in condos near transit.', NOW() - INTERVAL '40 days'),
  ('c0000002-0000-0000-0000-000000000005', 'Andrew & Lisa Park',   '+17785550678', 'parkfamily@outlook.com',       'buyer', 'sms',      'Upsizing family. Watching White Rock and South Surrey.', NOW() - INTERVAL '50 days');

-- ===================
-- LISTINGS (7 total — covering all stages)
-- ===================

-- LISTING 1: SOLD — Sharma condo (fully completed workflow)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-100000000001',
   '4521 Kingsway, Burnaby, BC V5H 2A3',
   'c0000001-0000-0000-0000-000000000001',
   'LB4521', 'sold', 'V1234567', 899900.00,
   '10:00:00', '19:00:00',
   'Sold at $915,000 — $15K over asking. 12 showings, 3 offers. Completed in 18 days on market.',
   NOW() - INTERVAL '55 days');

-- LISTING 2: SOLD — Chen luxury condo (over asking)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-100000000002',
   '1808-1288 W Georgia St, Vancouver, BC V6E 4R3',
   'c0000001-0000-0000-0000-000000000002',
   'LB1808', 'sold', 'V2345678', 1250000.00,
   '09:00:00', '20:00:00',
   'Luxury Coal Harbour 2BR. Sold at $1,285,000 — $35K over asking. 8 showings, 2 offers.',
   NOW() - INTERVAL '85 days');

-- LISTING 3: ACTIVE — Gill condo (Phase 5 — forms in progress, has showings)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-100000000003',
   '3205-4670 Assembly Way, Burnaby, BC V5H 4L7',
   'c0000001-0000-0000-0000-000000000004',
   'LB3205', 'active', 'V4567890', 648500.00,
   '10:00:00', '19:00:00',
   'Metrotown area 1BR+den. Strong interest from first-time buyers. Forms being generated.',
   NOW() - INTERVAL '25 days');

-- LISTING 4: ACTIVE — O'Brien White Rock (Phase 2 — data enrichment in progress)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-100000000004',
   '15234 Royal Ave, White Rock, BC V4B 1Z4',
   'c0000001-0000-0000-0000-000000000003',
   'LB1523', 'active', NULL, 1595000.00,
   '11:00:00', '17:00:00',
   'Detached 4BR ocean view. Running BC Geocoder and ParcelMap enrichment. No MLS yet.',
   NOW() - INTERVAL '10 days');

-- LISTING 5: ACTIVE — Tanaka North Van (Phase 7 — MLS prep, all forms done)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-100000000005',
   '203-150 W 15th St, North Vancouver, BC V7M 0C4',
   'c0000001-0000-0000-0000-000000000008',
   'LB0203', 'active', NULL, 725000.00,
   '10:00:00', '18:00:00',
   'Lower Lonsdale 2BR. All forms signed, generating MLS remarks. Ready to go live this week.',
   NOW() - INTERVAL '18 days');

-- LISTING 6: PENDING — Kovacs Yaletown (offer accepted, subject removal pending)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-100000000006',
   '1502-1455 Howe St, Vancouver, BC V6Z 1C2',
   'c0000001-0000-0000-0000-000000000006',
   'LB1502', 'pending', 'V6789012', 785000.00,
   '10:00:00', '19:00:00',
   'Yaletown 1BR. Offer accepted at $780,000. Subject removal Mar 25. Financing & inspection conditions.',
   NOW() - INTERVAL '40 days');

-- LISTING 7: ACTIVE — Singh Surrey (Phase 1 — just started intake)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-100000000007',
   '7845 128th St, Surrey, BC V3W 4E6',
   'c0000001-0000-0000-0000-000000000007',
   'LB7845', 'active', NULL, NULL,
   NULL, NULL,
   'New listing. Collecting seller identity docs and property details. Townhouse 3BR.',
   NOW() - INTERVAL '2 days');


-- ===================
-- APPOINTMENTS / SHOWINGS
-- ===================

-- Listing 1 (Sharma — SOLD): 4 past showings, all confirmed & completed
INSERT INTO appointments (id, listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, twilio_message_sid, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-100000000001',
   NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days' + INTERVAL '30 minutes',
   'confirmed', 'Amy Zhang', '+16045554200', 'amy.zhang@remax.ca',
   'SM_sharma_1', 'Buyer loved the layout. Asked about strata fees.', NOW() - INTERVAL '52 days'),
  ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-100000000001',
   NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days' + INTERVAL '30 minutes',
   'confirmed', 'Kevin Brar', '+17785553300', 'kevin@suttongroup.com',
   'SM_sharma_2', 'Second viewing. Client very interested.', NOW() - INTERVAL '49 days'),
  ('a0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-100000000001',
   NOW() - INTERVAL '46 days', NOW() - INTERVAL '46 days' + INTERVAL '30 minutes',
   'confirmed', 'Nina Sandhu', '+16045553700', 'nina@macdonaldrealty.com',
   'SM_sharma_3', 'Buyer submitted offer same day.', NOW() - INTERVAL '47 days'),
  ('a0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-100000000001',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days' + INTERVAL '30 minutes',
   'denied', 'Tom Singh', '+17785554100', 'tom.singh@century21.ca',
   'SM_sharma_4', NULL, NOW() - INTERVAL '46 days');

-- Listing 2 (Chen — SOLD): 3 past showings
INSERT INTO appointments (id, listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, twilio_message_sid, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-100000000002',
   NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days' + INTERVAL '30 minutes',
   'confirmed', 'James Park', '+16045554400', 'james.park@exprealty.com',
   'SM_chen_1', 'Very impressed with the harbour view.', NOW() - INTERVAL '72 days'),
  ('a0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-100000000002',
   NOW() - INTERVAL '68 days', NOW() - INTERVAL '68 days' + INTERVAL '30 minutes',
   'confirmed', 'Sarah Lee', '+16045554500', 'sarah.lee@royallepage.ca',
   'SM_chen_2', 'Second showing with client''s parents. Offer to follow.', NOW() - INTERVAL '69 days'),
  ('a0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-100000000002',
   NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days' + INTERVAL '30 minutes',
   'cancelled', 'Mike Johnson', '+17785554600', 'mike.j@remax.ca',
   'SM_chen_3', 'Buyer found another property.', NOW() - INTERVAL '67 days');

-- Listing 3 (Gill — ACTIVE Phase 5): 2 confirmed (1 past, 1 upcoming), 1 requested
INSERT INTO appointments (id, listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, twilio_message_sid, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-100000000003',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '30 minutes',
   'confirmed', 'Nina Sandhu', '+16045553700', 'nina@macdonaldrealty.com',
   'SM_gill_1', 'Buyer liked it but wants to see more options.', NOW() - INTERVAL '5 days'),
  ('a0000001-0000-0000-0000-000000000009', 'a0000001-0000-0000-0000-100000000003',
   NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '30 minutes',
   'confirmed', 'Amy Zhang', '+16045554200', 'amy.zhang@remax.ca',
   'SM_gill_2', NULL, NOW() - INTERVAL '1 day'),
  ('a0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-100000000003',
   NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '30 minutes',
   'requested', 'Ryan Chen', '+17785554600', 'ryan.chen@remax.ca',
   NULL, NULL, NOW() - INTERVAL '6 hours');

-- Listing 6 (Kovacs — PENDING): 3 past confirmed showings (before offer)
INSERT INTO appointments (id, listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, twilio_message_sid, notes, created_at) VALUES
  ('a0000001-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-100000000006',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '30 minutes',
   'confirmed', 'Kevin Brar', '+17785553300', 'kevin@suttongroup.com',
   'SM_kovacs_1', 'Client loved the Yaletown location.', NOW() - INTERVAL '22 days'),
  ('a0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-100000000006',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days' + INTERVAL '30 minutes',
   'confirmed', 'Tom Singh', '+17785554100', 'tom.singh@century21.ca',
   'SM_kovacs_2', 'Buyer submitted offer at $780K.', NOW() - INTERVAL '19 days'),
  ('a0000001-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-100000000006',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '30 minutes',
   'denied', 'James Park', '+16045554400', 'james.park@exprealty.com',
   'SM_kovacs_3', NULL, NOW() - INTERVAL '16 days');


-- ===================
-- COMMUNICATIONS
-- ===================

-- Sharma (seller) — sold listing comms
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'outbound', 'sms', 'Hi Priya, showing confirmed for tomorrow at 10am. Amy Zhang from RE/MAX.', NOW() - INTERVAL '52 days'),
  ('c0000001-0000-0000-0000-000000000001', 'inbound', 'whatsapp', 'Thanks! Lockbox code is same right?', NOW() - INTERVAL '52 days' + INTERVAL '15 minutes'),
  ('c0000001-0000-0000-0000-000000000001', 'outbound', 'whatsapp', 'Yes, LB4521. I''ll be there to open.', NOW() - INTERVAL '52 days' + INTERVAL '20 minutes'),
  ('c0000001-0000-0000-0000-000000000001', 'outbound', 'sms', 'Great news Priya! We received 3 offers. Let''s review them tomorrow morning.', NOW() - INTERVAL '44 days'),
  ('c0000001-0000-0000-0000-000000000001', 'inbound', 'sms', 'YES', NOW() - INTERVAL '44 days' + INTERVAL '5 minutes'),
  ('c0000001-0000-0000-0000-000000000001', 'outbound', 'sms', 'Congratulations! Offer accepted at $915,000. Subject removal in 7 days.', NOW() - INTERVAL '43 days');

-- Chen (seller)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('c0000001-0000-0000-0000-000000000002', 'outbound', 'sms', 'David, showing request from James Park for your Georgia St unit. Tomorrow 10am?', NOW() - INTERVAL '72 days'),
  ('c0000001-0000-0000-0000-000000000002', 'inbound', 'sms', 'YES', NOW() - INTERVAL '72 days' + INTERVAL '10 minutes'),
  ('c0000001-0000-0000-0000-000000000002', 'outbound', 'sms', 'Confirmed. Lockbox LB1808.', NOW() - INTERVAL '72 days' + INTERVAL '12 minutes'),
  ('c0000001-0000-0000-0000-000000000002', 'outbound', 'sms', 'Sold at $1,285,000! $35K over asking. Well done David.', NOW() - INTERVAL '60 days');

-- Gill (seller — active listing)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('c0000001-0000-0000-0000-000000000004', 'outbound', 'sms', 'Hi Harjit, showing request from Nina Sandhu for your Assembly Way condo. This Saturday 11am?', NOW() - INTERVAL '5 days'),
  ('c0000001-0000-0000-0000-000000000004', 'inbound', 'sms', 'YES', NOW() - INTERVAL '5 days' + INTERVAL '8 minutes'),
  ('c0000001-0000-0000-0000-000000000004', 'outbound', 'sms', 'Confirmed. Lockbox LB3205. I''ll let the agent know.', NOW() - INTERVAL '5 days' + INTERVAL '10 minutes'),
  ('c0000001-0000-0000-0000-000000000004', 'outbound', 'sms', 'New showing request from Ryan Chen for Thursday. Shall I confirm?', NOW() - INTERVAL '6 hours'),
  ('c0000001-0000-0000-0000-000000000004', 'inbound', 'sms', 'Yes please go ahead', NOW() - INTERVAL '5 hours');

-- Kovacs (seller — pending)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('c0000001-0000-0000-0000-000000000006', 'outbound', 'sms', 'Robert, we''ve received an offer at $780,000. Subject to financing and inspection. Removal date March 25.', NOW() - INTERVAL '14 days'),
  ('c0000001-0000-0000-0000-000000000006', 'inbound', 'sms', 'That sounds good. Let''s accept.', NOW() - INTERVAL '14 days' + INTERVAL '30 minutes'),
  ('c0000001-0000-0000-0000-000000000006', 'outbound', 'sms', 'Accepted. Buyer has until Mar 25 to remove subjects. I''ll keep you posted.', NOW() - INTERVAL '14 days' + INTERVAL '45 minutes');

-- Torres (buyer)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'outbound', 'sms', 'Hi Michael, found a great 1BR in Burnaby on Assembly Way. $648K. Want to see it?', NOW() - INTERVAL '8 days'),
  ('c0000002-0000-0000-0000-000000000001', 'inbound', 'sms', 'Yes! When can we go?', NOW() - INTERVAL '8 days' + INTERVAL '20 minutes'),
  ('c0000002-0000-0000-0000-000000000001', 'outbound', 'sms', 'Booked for this Saturday 11am. I''ll meet you there.', NOW() - INTERVAL '7 days');

-- Emily Nguyen (buyer)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('c0000002-0000-0000-0000-000000000004', 'outbound', 'whatsapp', 'Emily, new listing in Lower Lonsdale. 2BR, $725K, close to SeaBus. Interested?', NOW() - INTERVAL '5 days'),
  ('c0000002-0000-0000-0000-000000000004', 'inbound', 'whatsapp', 'Definitely! Can I see it this week?', NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
  ('c0000002-0000-0000-0000-000000000004', 'outbound', 'whatsapp', 'It''s not on MLS yet — should be live by Friday. I''ll book you first showing.', NOW() - INTERVAL '5 days' + INTERVAL '2 hours');


-- ===================
-- DEALS (6 deals across pipeline stages)
-- ===================

-- Deal 1: Sharma SOLD — seller deal (WON)
INSERT INTO deals (id, listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, possession_date, notes, created_at) VALUES
  ('d0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-100000000001', 'c0000001-0000-0000-0000-000000000001',
   'seller', 'closed', 'won',
   'Sharma — 4521 Kingsway SOLD',
   915000.00, 3.50, 32025.00,
   (NOW() - INTERVAL '37 days')::date, (NOW() - INTERVAL '30 days')::date,
   'Sold $15K over asking. 3 competing offers. Smooth closing.',
   NOW() - INTERVAL '55 days');

-- Deal 2: Chen SOLD — seller deal (WON)
INSERT INTO deals (id, listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, possession_date, notes, created_at) VALUES
  ('d0000001-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-100000000002', 'c0000001-0000-0000-0000-000000000002',
   'seller', 'closed', 'won',
   'Chen — 1288 W Georgia SOLD',
   1285000.00, 3.00, 38550.00,
   (NOW() - INTERVAL '55 days')::date, (NOW() - INTERVAL '45 days')::date,
   'Luxury sale. $35K over asking. 2 offers.',
   NOW() - INTERVAL '85 days');

-- Deal 3: Kovacs PENDING — seller deal (active, conditional)
INSERT INTO deals (id, listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, subject_removal_date, notes, created_at) VALUES
  ('d0000001-0000-0000-0000-000000000003',
   'a0000001-0000-0000-0000-100000000006', 'c0000001-0000-0000-0000-000000000006',
   'seller', 'conditional', 'active',
   'Kovacs — 1455 Howe St CONDITIONAL',
   780000.00, 3.25, 25350.00,
   (NOW() + INTERVAL '9 days')::date,
   'Offer accepted. Subject removal deadline March 25 — financing & inspection.',
   NOW() - INTERVAL '14 days');

-- Deal 4: Torres — buyer deal (new lead, active)
INSERT INTO deals (id, listing_id, contact_id, type, stage, status, title, value, commission_pct, notes, created_at) VALUES
  ('d0000001-0000-0000-0000-000000000004',
   NULL, 'c0000002-0000-0000-0000-000000000001',
   'buyer', 'new_lead', 'active',
   'Torres — First-Time Buyer Search',
   650000.00, 2.50,
   'Pre-approved $650K at TD. Looking at Burnaby condos. Showed Assembly Way unit.',
   NOW() - INTERVAL '15 days');

-- Deal 5: Kim CLOSED — buyer deal (WON)
INSERT INTO deals (id, listing_id, contact_id, type, stage, status, title, value, commission_pct, commission_amount, close_date, possession_date, notes, created_at) VALUES
  ('d0000001-0000-0000-0000-000000000005',
   NULL, 'c0000002-0000-0000-0000-000000000002',
   'buyer', 'closed', 'won',
   'Kim Family — 2845 Triumph St PURCHASED',
   1120000.00, 2.50, 28000.00,
   (NOW() - INTERVAL '25 days')::date, (NOW() - INTERVAL '18 days')::date,
   'Hastings-Sunrise 4BR detached. Great family home. Smooth transaction.',
   NOW() - INTERVAL '60 days');

-- Deal 6: Park — buyer deal (qualified, active)
INSERT INTO deals (id, listing_id, contact_id, type, stage, status, title, value, commission_pct, notes, created_at) VALUES
  ('d0000001-0000-0000-0000-000000000006',
   NULL, 'c0000002-0000-0000-0000-000000000005',
   'buyer', 'qualified', 'active',
   'Park Family — South Surrey Search',
   1500000.00, 2.50,
   'Looking at detached homes in White Rock / South Surrey. Budget $1.5M. Pre-approved.',
   NOW() - INTERVAL '20 days');


-- ===================
-- DEAL PARTIES
-- ===================

-- Sharma deal (closed)
INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'buyer_agent', 'Nina Sandhu', '+16045553700', 'nina@macdonaldrealty.com', 'Macdonald Realty'),
  ('d0000001-0000-0000-0000-000000000001', 'seller_lawyer', 'James Wong', '+16046041234', 'jwong@wonglaw.ca', 'Wong & Associates'),
  ('d0000001-0000-0000-0000-000000000001', 'buyer_lawyer', 'Maria Santos', '+16046045678', 'maria@santoslaw.ca', 'Santos Legal');

-- Chen deal (closed)
INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
  ('d0000001-0000-0000-0000-000000000002', 'buyer_agent', 'Sarah Lee', '+16045554500', 'sarah.lee@royallepage.ca', 'Royal LePage'),
  ('d0000001-0000-0000-0000-000000000002', 'seller_lawyer', 'Robert Fung', '+16046049999', 'rfung@funglaw.ca', 'Fung & Associates');

-- Kovacs deal (conditional)
INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
  ('d0000001-0000-0000-0000-000000000003', 'buyer_agent', 'Tom Singh', '+17785554100', 'tom.singh@century21.ca', 'Century 21'),
  ('d0000001-0000-0000-0000-000000000003', 'seller_lawyer', 'Helen Chu', '+16046043333', 'helen@chulaw.ca', 'Chu Legal');

-- Kim deal (closed)
INSERT INTO deal_parties (deal_id, role, name, phone, email, company) VALUES
  ('d0000001-0000-0000-0000-000000000005', 'seller_agent', 'Derek Williams', '+16045559876', 'derek@remax.ca', 'RE/MAX'),
  ('d0000001-0000-0000-0000-000000000005', 'buyer_lawyer', 'Anita Bhatt', '+16046042222', 'anita@bhattlaw.ca', 'Bhatt & Co.');


-- ===================
-- DEAL CHECKLISTS
-- ===================

-- Sharma deal — all completed
INSERT INTO deal_checklist (deal_id, item, due_date, completed, completed_at, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'CMA completed', (NOW() - INTERVAL '53 days')::date, true, NOW() - INTERVAL '53 days', 1),
  ('d0000001-0000-0000-0000-000000000001', 'Listing agreement signed', (NOW() - INTERVAL '52 days')::date, true, NOW() - INTERVAL '52 days', 2),
  ('d0000001-0000-0000-0000-000000000001', 'Photos & staging', (NOW() - INTERVAL '51 days')::date, true, NOW() - INTERVAL '51 days', 3),
  ('d0000001-0000-0000-0000-000000000001', 'MLS live', (NOW() - INTERVAL '50 days')::date, true, NOW() - INTERVAL '50 days', 4),
  ('d0000001-0000-0000-0000-000000000001', 'Offer accepted', (NOW() - INTERVAL '43 days')::date, true, NOW() - INTERVAL '43 days', 5),
  ('d0000001-0000-0000-0000-000000000001', 'Subjects removed', (NOW() - INTERVAL '40 days')::date, true, NOW() - INTERVAL '40 days', 6),
  ('d0000001-0000-0000-0000-000000000001', 'Closing completed', (NOW() - INTERVAL '37 days')::date, true, NOW() - INTERVAL '37 days', 7);

-- Kovacs deal — partial (conditional)
INSERT INTO deal_checklist (deal_id, item, due_date, completed, completed_at, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000003', 'Listing agreement signed', (NOW() - INTERVAL '38 days')::date, true, NOW() - INTERVAL '38 days', 1),
  ('d0000001-0000-0000-0000-000000000003', 'Photos & staging', (NOW() - INTERVAL '36 days')::date, true, NOW() - INTERVAL '36 days', 2),
  ('d0000001-0000-0000-0000-000000000003', 'MLS live', (NOW() - INTERVAL '35 days')::date, true, NOW() - INTERVAL '35 days', 3),
  ('d0000001-0000-0000-0000-000000000003', 'Offer accepted', (NOW() - INTERVAL '14 days')::date, true, NOW() - INTERVAL '14 days', 4),
  ('d0000001-0000-0000-0000-000000000003', 'Subject removal — financing', (NOW() + INTERVAL '9 days')::date, false, NULL, 5),
  ('d0000001-0000-0000-0000-000000000003', 'Subject removal — inspection', (NOW() + INTERVAL '9 days')::date, false, NULL, 6),
  ('d0000001-0000-0000-0000-000000000003', 'Closing', NULL, false, NULL, 7);

-- Kim deal — all completed
INSERT INTO deal_checklist (deal_id, item, due_date, completed, completed_at, sort_order) VALUES
  ('d0000001-0000-0000-0000-000000000005', 'Pre-approval confirmed', (NOW() - INTERVAL '58 days')::date, true, NOW() - INTERVAL '58 days', 1),
  ('d0000001-0000-0000-0000-000000000005', 'Property found', (NOW() - INTERVAL '45 days')::date, true, NOW() - INTERVAL '45 days', 2),
  ('d0000001-0000-0000-0000-000000000005', 'Offer submitted', (NOW() - INTERVAL '40 days')::date, true, NOW() - INTERVAL '40 days', 3),
  ('d0000001-0000-0000-0000-000000000005', 'Offer accepted', (NOW() - INTERVAL '38 days')::date, true, NOW() - INTERVAL '38 days', 4),
  ('d0000001-0000-0000-0000-000000000005', 'Inspection passed', (NOW() - INTERVAL '32 days')::date, true, NOW() - INTERVAL '32 days', 5),
  ('d0000001-0000-0000-0000-000000000005', 'Financing confirmed', (NOW() - INTERVAL '30 days')::date, true, NOW() - INTERVAL '30 days', 6),
  ('d0000001-0000-0000-0000-000000000005', 'Closing completed', (NOW() - INTERVAL '25 days')::date, true, NOW() - INTERVAL '25 days', 7);


-- ===================
-- MORTGAGES
-- ===================

-- Kim family — closed purchase
INSERT INTO mortgages (deal_id, contact_id, lender_name, mortgage_amount, interest_rate, mortgage_type, term_months, amortization_years, start_date, renewal_date, monthly_payment, notes) VALUES
  ('d0000001-0000-0000-0000-000000000005', 'c0000002-0000-0000-0000-000000000002',
   'CIBC', 896000.00, 4.89, 'fixed', 60, 25,
   (NOW() - INTERVAL '25 days')::date, (NOW() + INTERVAL '25 days')::date,
   5200.00, 'CIBC 5-year fixed. 20% down payment ($224K).');

-- Torres — pre-approval
INSERT INTO mortgages (deal_id, contact_id, lender_name, mortgage_amount, interest_rate, mortgage_type, term_months, amortization_years, renewal_date, notes) VALUES
  ('d0000001-0000-0000-0000-000000000004', 'c0000002-0000-0000-0000-000000000001',
   'TD Canada Trust', 600000.00, 4.79, 'fixed', 60, 25,
   (NOW() + INTERVAL '80 days')::date,
   'Pre-approval only. Valid for 120 days. $650K purchase power with 5% down.');


-- ===================
-- LISTING DOCUMENTS (only for completed/advanced listings)
-- ===================

-- Sharma (SOLD) — all docs
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('a0000001-0000-0000-0000-100000000001', 'FINTRAC', 'sharma_fintrac_signed.pdf', '/docs/sharma/fintrac.pdf'),
  ('a0000001-0000-0000-0000-100000000001', 'DORTS', 'sharma_dorts_signed.pdf', '/docs/sharma/dorts.pdf'),
  ('a0000001-0000-0000-0000-100000000001', 'PDS', 'sharma_pds_signed.pdf', '/docs/sharma/pds.pdf'),
  ('a0000001-0000-0000-0000-100000000001', 'CONTRACT', 'sharma_contract_of_purchase.pdf', '/docs/sharma/contract.pdf');

-- Chen (SOLD) — all docs
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('a0000001-0000-0000-0000-100000000002', 'FINTRAC', 'chen_fintrac_signed.pdf', '/docs/chen/fintrac.pdf'),
  ('a0000001-0000-0000-0000-100000000002', 'DORTS', 'chen_dorts_signed.pdf', '/docs/chen/dorts.pdf'),
  ('a0000001-0000-0000-0000-100000000002', 'PDS', 'chen_pds_signed.pdf', '/docs/chen/pds.pdf'),
  ('a0000001-0000-0000-0000-100000000002', 'CONTRACT', 'chen_contract_of_purchase.pdf', '/docs/chen/contract.pdf');

-- Tanaka (Phase 7 — all forms done, no contract yet)
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('a0000001-0000-0000-0000-100000000005', 'FINTRAC', 'tanaka_fintrac_signed.pdf', '/docs/tanaka/fintrac.pdf'),
  ('a0000001-0000-0000-0000-100000000005', 'DORTS', 'tanaka_dorts_signed.pdf', '/docs/tanaka/dorts.pdf'),
  ('a0000001-0000-0000-0000-100000000005', 'PDS', 'tanaka_pds_signed.pdf', '/docs/tanaka/pds.pdf');

-- Kovacs (pending — has docs)
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('a0000001-0000-0000-0000-100000000006', 'FINTRAC', 'kovacs_fintrac_signed.pdf', '/docs/kovacs/fintrac.pdf'),
  ('a0000001-0000-0000-0000-100000000006', 'DORTS', 'kovacs_dorts_signed.pdf', '/docs/kovacs/dorts.pdf'),
  ('a0000001-0000-0000-0000-100000000006', 'PDS', 'kovacs_pds_signed.pdf', '/docs/kovacs/pds.pdf');


-- ===================
-- FORM SUBMISSIONS (only for listings that should have them)
-- ===================

-- Sharma (SOLD) — all forms completed
INSERT INTO form_submissions (listing_id, form_key, form_data, status) VALUES
  ('a0000001-0000-0000-0000-100000000001', 'FINTRAC', '{"verified": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000001', 'DORTS', '{"signed": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000001', 'PDS', '{"disclosed": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000001', 'MLC', '{"signed": true}', 'completed');

-- Chen (SOLD) — all forms completed
INSERT INTO form_submissions (listing_id, form_key, form_data, status) VALUES
  ('a0000001-0000-0000-0000-100000000002', 'FINTRAC', '{"verified": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000002', 'DORTS', '{"signed": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000002', 'PDS', '{"disclosed": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000002', 'MLC', '{"signed": true}', 'completed');

-- Gill (Phase 5 — forms in progress)
INSERT INTO form_submissions (listing_id, form_key, form_data, status) VALUES
  ('a0000001-0000-0000-0000-100000000003', 'FINTRAC', '{"verified": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000003', 'DORTS', '{"draft": true}', 'draft'),
  ('a0000001-0000-0000-0000-100000000003', 'PDS', '{"draft": true}', 'draft');

-- Tanaka (Phase 7 — all forms completed)
INSERT INTO form_submissions (listing_id, form_key, form_data, status) VALUES
  ('a0000001-0000-0000-0000-100000000005', 'FINTRAC', '{"verified": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000005', 'DORTS', '{"signed": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000005', 'PDS', '{"disclosed": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000005', 'MLC', '{"signed": true}', 'completed');

-- Kovacs (pending — all forms completed before listing)
INSERT INTO form_submissions (listing_id, form_key, form_data, status) VALUES
  ('a0000001-0000-0000-0000-100000000006', 'FINTRAC', '{"verified": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000006', 'DORTS', '{"signed": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000006', 'PDS', '{"disclosed": true}', 'completed'),
  ('a0000001-0000-0000-0000-100000000006', 'MLC', '{"signed": true}', 'completed');


-- ===================
-- AI CONTENT (only for listings past Phase 7)
-- ===================

-- Sharma (SOLD) — full AI content
INSERT INTO prompts (listing_id, mls_public, mls_realtor, ig_caption, video_prompt, image_prompt) VALUES
  ('a0000001-0000-0000-0000-100000000001',
   'Stunning 2BR condo in the heart of Burnaby! Steps to Metrotown, SkyTrain & Crystal Mall. Open layout with floor-to-ceiling windows, modern kitchen, and mountain views. In-suite laundry, 1 parking + storage. Perfect for first-time buyers or investors.',
   'Well-maintained unit in sought-after Metrotown location. Strata fees include heat & hot water. Recent updates: new flooring, painted throughout. Rentals allowed. Very responsive strata. Seller motivated — relocating to Toronto.',
   'JUST SOLD in Metrotown! This stunning 2BR went $15K over asking with 3 competing offers. The Burnaby condo market is HOT right now. DM me if you''re thinking about selling!',
   'Cinematic walkthrough of modern condo with mountain views, sunlit rooms, sleek kitchen',
   'Aerial view of Burnaby Metrotown skyline at golden hour, modern condo building in foreground');

-- Tanaka (Phase 7 — MLS remarks being generated)
INSERT INTO prompts (listing_id, mls_public, mls_realtor) VALUES
  ('a0000001-0000-0000-0000-100000000005',
   'Bright 2BR in Lower Lonsdale! Walk to SeaBus, Lonsdale Quay & waterfront. Updated kitchen, in-suite laundry, 1 parking. Enjoy the best of North Shore living with easy downtown access.',
   'Corner unit with extra natural light. Strata well-managed with healthy contingency fund. Seller downsizing — motivated and flexible on possession.');


-- ===================
-- LISTING ACTIVITIES
-- ===================

-- Sharma (SOLD) — full activity history
INSERT INTO listing_activities (listing_id, activity_type, date, count, source, description) VALUES
  ('a0000001-0000-0000-0000-100000000001', 'view', (NOW() - INTERVAL '50 days')::date, 45, 'MLS', 'MLS listing views first week'),
  ('a0000001-0000-0000-0000-100000000001', 'view', (NOW() - INTERVAL '48 days')::date, 12, 'Realtor.ca', 'Realtor.ca views'),
  ('a0000001-0000-0000-0000-100000000001', 'showing', (NOW() - INTERVAL '50 days')::date, 4, 'Agent', 'Total showings'),
  ('a0000001-0000-0000-0000-100000000001', 'inquiry', (NOW() - INTERVAL '49 days')::date, 3, 'Email', 'Buyer agent inquiries'),
  ('a0000001-0000-0000-0000-100000000001', 'offer', (NOW() - INTERVAL '44 days')::date, 3, 'Agent', 'Multiple offers received');

-- Gill (ACTIVE) — growing activity
INSERT INTO listing_activities (listing_id, activity_type, date, count, source, description) VALUES
  ('a0000001-0000-0000-0000-100000000003', 'view', (NOW() - INTERVAL '20 days')::date, 28, 'MLS', 'MLS listing views'),
  ('a0000001-0000-0000-0000-100000000003', 'view', (NOW() - INTERVAL '15 days')::date, 8, 'Realtor.ca', 'Realtor.ca views'),
  ('a0000001-0000-0000-0000-100000000003', 'showing', (NOW() - INTERVAL '3 days')::date, 1, 'Agent', 'First showing completed'),
  ('a0000001-0000-0000-0000-100000000003', 'inquiry', (NOW() - INTERVAL '10 days')::date, 2, 'Email', 'Buyer agent inquiries');

-- Kovacs (PENDING) — pre-offer activity
INSERT INTO listing_activities (listing_id, activity_type, date, count, source, description) VALUES
  ('a0000001-0000-0000-0000-100000000006', 'view', (NOW() - INTERVAL '35 days')::date, 52, 'MLS', 'MLS listing views'),
  ('a0000001-0000-0000-0000-100000000006', 'showing', (NOW() - INTERVAL '20 days')::date, 3, 'Agent', 'Total showings before offer'),
  ('a0000001-0000-0000-0000-100000000006', 'offer', (NOW() - INTERVAL '14 days')::date, 1, 'Agent', 'Offer received and accepted');


-- ===================
-- OPEN HOUSES
-- ===================

-- Gill listing — 1 completed, 1 upcoming
INSERT INTO open_houses (id, listing_id, date, start_time, end_time, type, status, visitor_count, notes) VALUES
  ('00000001-0000-0000-0000-200000000001', 'a0000001-0000-0000-0000-100000000003',
   (NOW() - INTERVAL '7 days')::date, '13:00', '15:00', 'public', 'completed', 8,
   'Good turnout. 3 serious buyers.'),
  ('00000001-0000-0000-0000-200000000002', 'a0000001-0000-0000-0000-100000000003',
   (NOW() + INTERVAL '5 days')::date, '13:00', '15:00', 'public', 'scheduled', 0,
   'Second open house planned.');

-- Open house visitors for completed event
INSERT INTO open_house_visitors (open_house_id, name, phone, email, agent_name, interest_level, feedback, wants_followup) VALUES
  ('00000001-0000-0000-0000-200000000001', 'Wei Zhang', '+16045559111', 'wei.z@gmail.com', NULL, 'hot', 'Loved the layout. Wants to bring partner back.', true),
  ('00000001-0000-0000-0000-200000000001', 'Chris Martin', '+17785559222', 'chris.m@outlook.com', 'Amy Zhang', 'warm', 'Nice unit. Comparing with another in the building.', true),
  ('00000001-0000-0000-0000-200000000001', 'Nadia Khan', '+16045559333', NULL, NULL, 'cold', 'Just browsing the area. Not actively looking.', false);


-- ===================
-- TASKS
-- ===================
INSERT INTO tasks (title, description, status, priority, category, due_date, contact_id, listing_id) VALUES
  ('Follow up with Wei Zhang from open house', 'Hot lead — wants second viewing with partner', 'pending', 'high', 'follow_up', (NOW() + INTERVAL '1 day')::date, NULL, 'a0000001-0000-0000-0000-100000000003'),
  ('Complete DORTS form for Gill listing', 'Draft started. Need seller signatures.', 'in_progress', 'high', 'document', (NOW() + INTERVAL '2 days')::date, 'c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-100000000003'),
  ('Run BC Geocoder for O''Brien listing', 'Data enrichment Phase 2 — geocoding pending', 'pending', 'medium', 'listing', (NOW() + INTERVAL '1 day')::date, 'c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-100000000004'),
  ('Upload MLS photos for Tanaka listing', 'All forms done. Preparing for MLS submission.', 'pending', 'high', 'marketing', (NOW() + INTERVAL '2 days')::date, 'c0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-100000000005'),
  ('Collect seller ID docs from Singh', 'FINTRAC intake — need passport or DL copy', 'pending', 'urgent', 'document', (NOW())::date, 'c0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-100000000007'),
  ('Confirm inspection date for Kovacs deal', 'Buyer needs home inspection before subject removal', 'in_progress', 'urgent', 'inspection', (NOW() + INTERVAL '5 days')::date, 'c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-100000000006'),
  ('Send Emily Nguyen Tanaka listing details', 'Once MLS is live — she''s first showing priority', 'pending', 'medium', 'follow_up', (NOW() + INTERVAL '3 days')::date, 'c0000002-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-100000000005'),
  ('Schedule second open house for Gill', 'First one had good turnout. Plan for next weekend.', 'completed', 'medium', 'showing', (NOW() - INTERVAL '1 day')::date, 'c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-100000000003'),
  ('Park family — send White Rock listings', 'Raj mentioned new listings on Marine Dr', 'pending', 'low', 'follow_up', (NOW() + INTERVAL '4 days')::date, 'c0000002-0000-0000-0000-000000000005', NULL),
  ('Prepare closing docs for Sharma', 'Final paperwork for completed sale', 'completed', 'high', 'closing', (NOW() - INTERVAL '37 days')::date, 'c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-100000000001');


-- ===================
-- CONTACT FAMILY MEMBERS
-- ===================
INSERT INTO contact_family_members (contact_id, name, relationship, phone, email) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Amit Sharma', 'spouse', '+16045551235', 'amit.sharma@gmail.com'),
  ('c0000001-0000-0000-0000-000000000004', 'Gurpreet Gill', 'spouse', '+17785554568', 'gurpreet.gill@gmail.com'),
  ('c0000002-0000-0000-0000-000000000002', 'James Kim', 'spouse', '+17785550124', 'james.kim@outlook.com'),
  ('c0000002-0000-0000-0000-000000000002', 'Lily Kim', 'child', NULL, NULL),
  ('c0000002-0000-0000-0000-000000000005', 'Lisa Park', 'spouse', '+17785550679', 'lisa.park@outlook.com');


-- ===================
-- CONTACT IMPORTANT DATES
-- ===================
INSERT INTO contact_important_dates (contact_id, date_type, date_value, label, recurring, remind_days_before) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'birthday', '1985-06-15', 'Priya''s birthday', true, 7),
  ('c0000001-0000-0000-0000-000000000002', 'closing_anniversary', (NOW() - INTERVAL '60 days')::date, 'Georgia St sale anniversary', true, 14),
  ('c0000002-0000-0000-0000-000000000002', 'move_in', (NOW() - INTERVAL '18 days')::date, 'Kim family moved into Triumph St', true, 7),
  ('c0000002-0000-0000-0000-000000000002', 'birthday', '1988-09-22', 'Sarah Kim''s birthday', true, 7),
  ('c0000001-0000-0000-0000-000000000003', 'birthday', '1958-03-10', 'Margaret''s birthday', true, 7);
