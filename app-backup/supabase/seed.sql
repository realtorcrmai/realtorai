-- ============================================================
-- COMPREHENSIVE SEED DATA — RealtorAI
-- Covers ALL workflow scenarios across contacts, listings,
-- showings, tasks, communications, documents, and forms.
-- ============================================================

-- 1. CLEAN SLATE — delete in dependency order
DELETE FROM form_submissions;
DELETE FROM listing_documents;
DELETE FROM communications;
DELETE FROM appointments;
DELETE FROM tasks;
DELETE FROM listings;
DELETE FROM contacts;
DELETE FROM form_templates;

-- ============================================================
-- 2. CONTACTS — mix of buyers & sellers at every lifecycle stage
-- ============================================================

-- Sellers (7 — one per listing workflow scenario)
INSERT INTO contacts (id, name, phone, email, type, pref_channel, notes) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Margaret Chen',       '+16045551001', 'margaret.chen@email.com',   'seller', 'sms',      'Downsizing from family home. Motivated seller — wants to close before summer.'),
  ('a0000000-0000-0000-0000-000000000002', 'David & Priya Patel', '+16045551002', 'patels@email.com',          'seller', 'whatsapp', 'Relocating to Toronto for work. Dual income, flexible on timing.'),
  ('a0000000-0000-0000-0000-000000000003', 'Robert Yamamoto',     '+16045551003', 'ryamamoto@email.com',       'seller', 'sms',      'Investment property sale. Wants top dollar, no rush.'),
  ('a0000000-0000-0000-0000-000000000004', 'Sarah O''Brien',      '+16045551004', 'sarah.obrien@email.com',    'seller', 'whatsapp', 'Estate sale — inherited property. First-time seller needs guidance.'),
  ('a0000000-0000-0000-0000-000000000005', 'James & Lisa Wong',   '+16045551005', 'wongs@email.com',           'seller', 'sms',      'Upgrading to larger home. Need to sell before buying.'),
  ('a0000000-0000-0000-0000-000000000006', 'Elena Petrova',       '+16045551006', 'elena.p@email.com',         'seller', 'sms',      'Condo owner, moving overseas. Price-sensitive, wants quick sale.'),
  ('a0000000-0000-0000-0000-000000000007', 'Michael Thompson',    '+16045551007', 'mthompson@email.com',       'seller', 'whatsapp', 'Luxury waterfront property. High expectations on marketing & staging.');

-- Buyers (7 — at various contact lifecycle stages)
INSERT INTO contacts (id, name, phone, email, type, pref_channel, notes) VALUES
  -- New Lead: just added, no notes yet → qualification "in-progress"
  ('b0000000-0000-0000-0000-000000000001', 'Kevin Nakamura',      '+16045552001', 'knakamura@email.com',       'buyer', 'sms',      NULL),
  -- Qualified: has notes but no listings → qualification "completed", active-search "pending"
  ('b0000000-0000-0000-0000-000000000002', 'Amanda Foster',       '+16045552002', 'afoster@email.com',         'buyer', 'whatsapp', 'Budget $800K–$950K. Prefers East Van. Needs 3BR minimum.'),
  -- Active Search: has notes, associated with active listing showings
  ('b0000000-0000-0000-0000-000000000003', 'Carlos & Maria Rodriguez', '+16045552003', 'rodriguez@email.com',  'buyer', 'sms',      'First-time buyers. Pre-approved $750K. Looking in Burnaby/New West.'),
  -- Transaction: associated with pending listing
  ('b0000000-0000-0000-0000-000000000004', 'Jennifer Liu',        '+16045552004', 'jliu@email.com',            'buyer', 'whatsapp', 'Investor buyer. Cash offer ready. Looking for rental income properties.'),
  -- Post-Close: associated with sold listing
  ('b0000000-0000-0000-0000-000000000005', 'Thomas & Rachel Kim', '+16045552005', 'kims@email.com',            'buyer', 'sms',      'Successfully closed on Maple St. Referral potential — large social network.'),
  -- Active with multiple interests
  ('b0000000-0000-0000-0000-000000000006', 'Stephanie Park',      '+16045552006', 'spark@email.com',           'buyer', 'whatsapp', 'Relocating from Calgary. Remote worker, flexible on neighbourhood.'),
  -- Qualified, starting search
  ('b0000000-0000-0000-0000-000000000007', 'Omar Hassan',         '+16045552007', 'ohassan@email.com',         'buyer', 'sms',      'Budget $1.2M. Wants detached home with suite for parents.');

-- ============================================================
-- 3. LISTINGS — cover all 3 statuses × all workflow stages
-- ============================================================

-- LISTING 1: SOLD — fully completed workflow (all docs, MLS, sold)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   '1234 Maple Street, Vancouver, BC V5K 1A1',
   'a0000000-0000-0000-0000-000000000001',
   'MC-4521', 'sold', 'V1234567', 1289000.00,
   '10:00', '18:00',
   'Sold $25K over asking. Multiple offers received. Closed Mar 1, 2026.',
   '2025-12-01T10:00:00Z');

-- LISTING 2: PENDING — under contract, docs complete, MLS listed
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000002',
   '567 Oak Avenue, Burnaby, BC V5H 2L3',
   'a0000000-0000-0000-0000-000000000002',
   'DP-8833', 'pending', 'V2345678', 879000.00,
   '11:00', '17:00',
   'Subject removal date: Mar 28, 2026. Buyer financing condition outstanding.',
   '2026-01-15T10:00:00Z');

-- LISTING 3: ACTIVE — on MLS, docs done, showings happening
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000003',
   '890 Cedar Drive, North Vancouver, BC V7L 4K2',
   'a0000000-0000-0000-0000-000000000003',
   'RY-1122', 'active', 'V3456789', 1650000.00,
   '09:00', '19:00',
   'Premium view property. Open house scheduled for weekends.',
   '2026-02-01T10:00:00Z');

-- LISTING 4: ACTIVE — has price, has docs, NO MLS number yet (MLS Prep stage)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000004',
   '45 Birch Lane, West Vancouver, BC V7T 1A1',
   'a0000000-0000-0000-0000-000000000004',
   'SO-3344', 'active', NULL, 2150000.00,
   '10:00', '16:00',
   'Estate sale. Professional photos scheduled. Awaiting MLS submission.',
   '2026-02-20T10:00:00Z');

-- LISTING 5: ACTIVE — has price, NO docs yet (Form Generation stage)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000005',
   '222 Elm Court, Coquitlam, BC V3K 6R2',
   'a0000000-0000-0000-0000-000000000005',
   'WG-5566', 'active', NULL, 925000.00,
   '11:00', '18:00',
   'Forms being prepared. CMA completed, price agreed upon.',
   '2026-03-01T10:00:00Z');

-- LISTING 6: ACTIVE — NO price yet (Data Enrichment / early stage)
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000006',
   '78 Spruce Boulevard, Richmond, BC V6Y 3E1',
   'a0000000-0000-0000-0000-000000000006',
   'EP-7788', 'active', NULL, NULL,
   '10:00', '17:00',
   'New intake. Gathering property data, assessment pending.',
   '2026-03-10T10:00:00Z');

-- LISTING 7: ACTIVE — luxury, full MLS, lots of activity
INSERT INTO listings (id, address, seller_id, lockbox_code, status, mls_number, list_price, showing_window_start, showing_window_end, notes, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000007',
   '1 Waterfront Place, Coal Harbour, Vancouver, BC V6E 4A1',
   'a0000000-0000-0000-0000-000000000007',
   'MT-9900', 'active', 'V7890123', 3450000.00,
   '10:00', '20:00',
   'Penthouse unit. Premium marketing package. Multiple showings weekly.',
   '2026-01-20T10:00:00Z');

-- ============================================================
-- 4. LISTING DOCUMENTS — various completion levels
-- ============================================================

-- Listing 1 (SOLD): all docs
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'FINTRAC',  'FINTRAC_MapleSt.pdf',  '/docs/fintrac_maple.pdf'),
  ('c0000000-0000-0000-0000-000000000001', 'DORTS',    'DORTS_MapleSt.pdf',    '/docs/dorts_maple.pdf'),
  ('c0000000-0000-0000-0000-000000000001', 'PDS',      'PDS_MapleSt.pdf',      '/docs/pds_maple.pdf'),
  ('c0000000-0000-0000-0000-000000000001', 'CONTRACT', 'Contract_MapleSt.pdf', '/docs/contract_maple.pdf'),
  ('c0000000-0000-0000-0000-000000000001', 'TITLE',    'Title_MapleSt.pdf',    '/docs/title_maple.pdf');

-- Listing 2 (PENDING): all required docs
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'FINTRAC',  'FINTRAC_OakAve.pdf',  '/docs/fintrac_oak.pdf'),
  ('c0000000-0000-0000-0000-000000000002', 'DORTS',    'DORTS_OakAve.pdf',    '/docs/dorts_oak.pdf'),
  ('c0000000-0000-0000-0000-000000000002', 'PDS',      'PDS_OakAve.pdf',      '/docs/pds_oak.pdf'),
  ('c0000000-0000-0000-0000-000000000002', 'CONTRACT', 'Contract_OakAve.pdf', '/docs/contract_oak.pdf');

-- Listing 3 (ACTIVE + MLS): all required docs
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('c0000000-0000-0000-0000-000000000003', 'FINTRAC',  'FINTRAC_CedarDr.pdf',  '/docs/fintrac_cedar.pdf'),
  ('c0000000-0000-0000-0000-000000000003', 'DORTS',    'DORTS_CedarDr.pdf',    '/docs/dorts_cedar.pdf'),
  ('c0000000-0000-0000-0000-000000000003', 'PDS',      'PDS_CedarDr.pdf',      '/docs/pds_cedar.pdf');

-- Listing 4 (MLS Prep): all required docs (ready for MLS but not submitted)
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('c0000000-0000-0000-0000-000000000004', 'FINTRAC',  'FINTRAC_BirchLn.pdf',  '/docs/fintrac_birch.pdf'),
  ('c0000000-0000-0000-0000-000000000004', 'DORTS',    'DORTS_BirchLn.pdf',    '/docs/dorts_birch.pdf'),
  ('c0000000-0000-0000-0000-000000000004', 'PDS',      'PDS_BirchLn.pdf',      '/docs/pds_birch.pdf');

-- Listing 5 (Form Gen): partial docs (only FINTRAC so far)
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('c0000000-0000-0000-0000-000000000005', 'FINTRAC',  'FINTRAC_ElmCt.pdf',   '/docs/fintrac_elm.pdf');

-- Listing 6 (Early stage): NO documents yet
-- Listing 7 (Luxury active + MLS): all required docs + extras
INSERT INTO listing_documents (listing_id, doc_type, file_name, file_url) VALUES
  ('c0000000-0000-0000-0000-000000000007', 'FINTRAC',  'FINTRAC_Waterfront.pdf', '/docs/fintrac_waterfront.pdf'),
  ('c0000000-0000-0000-0000-000000000007', 'DORTS',    'DORTS_Waterfront.pdf',   '/docs/dorts_waterfront.pdf'),
  ('c0000000-0000-0000-0000-000000000007', 'PDS',      'PDS_Waterfront.pdf',     '/docs/pds_waterfront.pdf'),
  ('c0000000-0000-0000-0000-000000000007', 'TITLE',    'Title_Waterfront.pdf',   '/docs/title_waterfront.pdf');

-- ============================================================
-- 5. APPOINTMENTS (SHOWINGS) — every status × workflow stage
-- ============================================================

-- Listing 1 (SOLD): completed showings with feedback
INSERT INTO appointments (id, listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, twilio_message_sid, notes) VALUES
  ('d0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001',
   '2026-01-15T14:00:00Z', '2026-01-15T15:00:00Z',
   'confirmed', 'Alex Morgan', '+16045553001', 'amorgan@realty.com',
   'SM_maple_001', 'Buyer loved the layout. Made offer next day.'),
  ('d0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000001',
   '2026-01-18T11:00:00Z', '2026-01-18T12:00:00Z',
   'confirmed', 'Beth Sawyer', '+16045553002', 'bsawyer@realty.com',
   'SM_maple_002', 'Client was impressed but went with another property.');

-- Listing 2 (PENDING): confirmed showing (past) + denied one
INSERT INTO appointments (id, listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, twilio_message_sid, notes) VALUES
  ('d0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000002',
   '2026-02-10T13:00:00Z', '2026-02-10T14:00:00Z',
   'confirmed', 'Jennifer Liu', '+16045552004', 'jliu@email.com',
   'SM_oak_001', 'Buyer submitted offer after this showing.'),
  ('d0000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000002',
   '2026-02-12T15:00:00Z', '2026-02-12T16:00:00Z',
   'denied', 'Frank Zhao', '+16045553004', 'fzhao@realty.com',
   'SM_oak_002', 'Seller unavailable — rescheduling requested.');

-- Listing 3 (ACTIVE + MLS): mix of all statuses
INSERT INTO appointments (id, listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, twilio_message_sid, notes) VALUES
  -- Past confirmed with feedback (all 5 steps complete)
  ('d0000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000003',
   '2026-03-05T10:00:00Z', '2026-03-05T11:00:00Z',
   'confirmed', 'Carlos Rodriguez', '+16045552003', 'rodriguez@email.com',
   'SM_cedar_001', 'Buyers very interested. Asking about strata fees.'),
  -- Future confirmed (step 4 in-progress, step 5 pending)
  ('d0000000-0000-0000-0000-000000000006',
   'c0000000-0000-0000-0000-000000000003',
   '2026-03-25T14:00:00Z', '2026-03-25T15:00:00Z',
   'confirmed', 'Stephanie Park', '+16045552006', 'spark@email.com',
   'SM_cedar_002', NULL),
  -- Requested, SMS sent but no response yet (step 3 in-progress)
  ('d0000000-0000-0000-0000-000000000007',
   'c0000000-0000-0000-0000-000000000003',
   '2026-03-26T11:00:00Z', '2026-03-26T12:00:00Z',
   'requested', 'Omar Hassan', '+16045552007', 'ohassan@email.com',
   'SM_cedar_003', NULL),
  -- Requested, NO SMS sent yet (step 2 in-progress)
  ('d0000000-0000-0000-0000-000000000008',
   'c0000000-0000-0000-0000-000000000003',
   '2026-03-27T16:00:00Z', '2026-03-27T17:00:00Z',
   'requested', 'Amanda Foster', '+16045552002', 'afoster@email.com',
   NULL, NULL),
  -- Cancelled
  ('d0000000-0000-0000-0000-000000000009',
   'c0000000-0000-0000-0000-000000000003',
   '2026-03-10T13:00:00Z', '2026-03-10T14:00:00Z',
   'cancelled', 'Kevin Nakamura', '+16045552001', 'knakamura@email.com',
   'SM_cedar_004', 'Buyer cancelled — found another property.');

-- Listing 7 (Luxury): heavy showing activity
INSERT INTO appointments (id, listing_id, start_time, end_time, status, buyer_agent_name, buyer_agent_phone, buyer_agent_email, twilio_message_sid, notes) VALUES
  ('d0000000-0000-0000-0000-000000000010',
   'c0000000-0000-0000-0000-000000000007',
   '2026-02-20T14:00:00Z', '2026-02-20T15:30:00Z',
   'confirmed', 'Diana Prince', '+16045553010', 'dprince@luxuryrealty.com',
   'SM_wf_001', 'High-net-worth buyer. Very interested in the view. Requested second showing.'),
  ('d0000000-0000-0000-0000-000000000011',
   'c0000000-0000-0000-0000-000000000007',
   '2026-03-01T10:00:00Z', '2026-03-01T11:30:00Z',
   'confirmed', 'Diana Prince', '+16045553010', 'dprince@luxuryrealty.com',
   'SM_wf_002', 'Second showing. Buyer measuring rooms. Likely offer coming.'),
  ('d0000000-0000-0000-0000-000000000012',
   'c0000000-0000-0000-0000-000000000007',
   '2026-03-22T15:00:00Z', '2026-03-22T16:00:00Z',
   'confirmed', 'Raj Mehta', '+16045553011', 'rmehta@realty.com',
   'SM_wf_003', NULL),
  ('d0000000-0000-0000-0000-000000000013',
   'c0000000-0000-0000-0000-000000000007',
   '2026-03-28T11:00:00Z', '2026-03-28T12:00:00Z',
   'requested', 'Sophie Laurent', '+16045553012', 'slaurent@realty.com',
   'SM_wf_004', NULL);

-- ============================================================
-- 6. COMMUNICATIONS — timeline logs for contacts
-- ============================================================

-- Margaret Chen (seller, sold listing — rich history)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'outbound', 'sms',   'Hi Margaret, this is your agent. I''ve started the listing process for 1234 Maple St. I''ll need some documents from you.', '2025-12-01T12:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'inbound',  'sms',   'Great! What do you need from me?', '2025-12-01T12:30:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'outbound', 'email', 'Sent FINTRAC verification form and listing agreement for e-signature.', '2025-12-02T10:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'inbound',  'email', 'All signed and returned. Looking forward to getting this listed!', '2025-12-03T09:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'outbound', 'sms',   'Your property is now live on MLS! MLS# V1234567. List price: $1,289,000.', '2025-12-15T14:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'outbound', 'sms',   'We received 3 offers! Let me walk you through each one.', '2026-01-20T16:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'outbound', 'sms',   'Congratulations! Your property has SOLD for $1,314,000! 🎉', '2026-03-01T15:00:00Z'),
  ('a0000000-0000-0000-0000-000000000001', 'inbound',  'sms',   'Thank you so much! Amazing experience.', '2026-03-01T15:30:00Z');

-- David & Priya Patel (pending listing — active comms)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'outbound', 'whatsapp', 'Hi David & Priya, listing agreement sent via DocuSign. Please review and sign.', '2026-01-15T11:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'inbound',  'whatsapp', 'Signed! When will it be on MLS?', '2026-01-16T09:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'outbound', 'whatsapp', 'Live on MLS now! MLS# V2345678. Already getting showing requests.', '2026-01-20T14:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'outbound', 'whatsapp', 'Great news — we have an offer! Subject to financing, removal date Mar 28.', '2026-02-15T16:00:00Z'),
  ('a0000000-0000-0000-0000-000000000002', 'inbound',  'whatsapp', 'Exciting! Fingers crossed on the financing condition.', '2026-02-15T16:30:00Z');

-- Robert Yamamoto (active + MLS, investment property)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000003', 'outbound', 'sms',   'Hi Robert, CMA report is ready. Suggested list price: $1,650,000. Shall we discuss?', '2026-02-01T10:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'inbound',  'sms',   'That aligns with my expectations. Let''s proceed.', '2026-02-01T11:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'outbound', 'sms',   'Property listed! MLS# V3456789. Multiple showing requests already.', '2026-02-05T14:00:00Z'),
  ('a0000000-0000-0000-0000-000000000003', 'outbound', 'sms',   'Showing feedback: 3 of 5 buyers expressed strong interest. Market is responding well.', '2026-03-10T10:00:00Z');

-- Sarah O'Brien (MLS prep stage)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'outbound', 'whatsapp', 'Hi Sarah, I''m helping you sell your inherited property at 45 Birch Lane. Let me guide you through the process.', '2026-02-20T10:00:00Z'),
  ('a0000000-0000-0000-0000-000000000004', 'inbound',  'whatsapp', 'Thank you. This is all new to me. What''s the first step?', '2026-02-20T11:00:00Z'),
  ('a0000000-0000-0000-0000-000000000004', 'outbound', 'whatsapp', 'All documents signed. Professional photos are scheduled for this week. MLS listing coming soon!', '2026-03-15T10:00:00Z');

-- Elena Petrova (early stage — no price yet)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000006', 'outbound', 'sms',   'Hi Elena, I''ve started gathering data on your condo at 78 Spruce Blvd. Assessment data should be ready this week.', '2026-03-10T10:00:00Z'),
  ('a0000000-0000-0000-0000-000000000006', 'inbound',  'sms',   'Great, keep me posted. I need to have this done before my move date.', '2026-03-10T11:00:00Z');

-- Kevin Nakamura (new buyer lead — minimal)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'inbound',  'sms',   'Hi, I saw your listing on Cedar Drive. I''m interested in viewing.', '2026-03-08T09:00:00Z'),
  ('b0000000-0000-0000-0000-000000000001', 'outbound', 'sms',   'Welcome Kevin! I''d be happy to arrange a showing. What times work for you?', '2026-03-08T09:15:00Z');

-- Amanda Foster (qualified buyer)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'outbound', 'whatsapp', 'Hi Amanda, based on your criteria I have 4 properties to show you in East Van. Available this weekend?', '2026-03-12T10:00:00Z'),
  ('b0000000-0000-0000-0000-000000000002', 'inbound',  'whatsapp', 'Saturday works! Morning preferred.', '2026-03-12T11:00:00Z'),
  ('b0000000-0000-0000-0000-000000000002', 'outbound', 'whatsapp', 'Booked showings for Saturday 10am-1pm. I''ll send addresses tonight.', '2026-03-12T14:00:00Z');

-- Carlos & Maria Rodriguez (active buyers with showing)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000003', 'outbound', 'sms',   'Hi Carlos & Maria, showing confirmed for 890 Cedar Drive on Mar 5 at 10am.', '2026-03-04T10:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'inbound',  'sms',   'We''ll be there! Very excited about this one.', '2026-03-04T10:30:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'outbound', 'sms',   'How did you like the property? Any questions about strata fees?', '2026-03-05T16:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'inbound',  'sms',   'We loved it! Can we get more details on the strata council minutes?', '2026-03-05T17:00:00Z');

-- Jennifer Liu (investor buyer — transaction stage)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000004', 'outbound', 'whatsapp', 'Jennifer, your offer on 567 Oak Ave has been accepted! Subject to financing — removal by Mar 28.', '2026-02-15T16:00:00Z'),
  ('b0000000-0000-0000-0000-000000000004', 'inbound',  'whatsapp', 'Excellent! My broker is working on the financing. Should have it confirmed by next week.', '2026-02-15T17:00:00Z');

-- Thomas & Rachel Kim (post-close buyer)
INSERT INTO communications (contact_id, direction, channel, body, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000005', 'outbound', 'sms',   'Congratulations on your new home at 1234 Maple St! Here''s a moving checklist.', '2026-03-01T16:00:00Z'),
  ('b0000000-0000-0000-0000-000000000005', 'inbound',  'sms',   'Thank you for everything! We''ll definitely recommend you to friends.', '2026-03-02T10:00:00Z'),
  ('b0000000-0000-0000-0000-000000000005', 'outbound', 'sms',   'That means a lot! Don''t hesitate to reach out if you need anything for the new place.', '2026-03-02T10:30:00Z');

-- ============================================================
-- 7. TASKS — all categories, priorities, statuses
-- ============================================================
INSERT INTO tasks (title, description, status, priority, category, due_date, contact_id, listing_id, completed_at) VALUES
  -- Completed tasks
  ('Send FINTRAC form to Margaret Chen',
   'FINTRAC identity verification for 1234 Maple St listing.',
   'completed', 'high', 'document', '2025-12-05',
   'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2025-12-03T10:00:00Z'),

  ('Complete CMA for Maple Street',
   'Pull comps, analyze trends, generate CMA report for seller presentation.',
   'completed', 'high', 'listing', '2025-12-10',
   'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2025-12-08T14:00:00Z'),

  ('Submit Maple St to MLS',
   'Enter all listing data, verify details, submit to board.',
   'completed', 'urgent', 'listing', '2025-12-15',
   'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '2025-12-14T16:00:00Z'),

  ('Post-closing follow-up with Kims',
   'Send thank-you note and moving checklist to buyers.',
   'completed', 'medium', 'follow_up', '2026-03-05',
   'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', '2026-03-02T11:00:00Z'),

  -- In-progress tasks
  ('Monitor subject removal — Oak Ave',
   'Track financing condition for Patel listing. Removal date: Mar 28.',
   'in_progress', 'urgent', 'closing', '2026-03-28',
   'a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', NULL),

  ('Schedule professional photos — Birch Lane',
   'Coordinate photographer for estate sale property. Sarah prefers weekday mornings.',
   'in_progress', 'high', 'marketing', '2026-03-22',
   'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', NULL),

  ('Prepare DORTS for Elm Court',
   'Draft Data Office Reporting / Trust Sheet for Wong listing.',
   'in_progress', 'high', 'document', '2026-03-20',
   'a0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', NULL),

  ('Follow up with Carlos Rodriguez',
   'Send strata council minutes and additional property details for Cedar Drive.',
   'in_progress', 'medium', 'follow_up', '2026-03-21',
   'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', NULL),

  -- Pending tasks
  ('Complete property assessment — Spruce Blvd',
   'Pull BC Assessment data, tax records, and title search for Petrova condo.',
   'pending', 'high', 'listing', '2026-03-25',
   'a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', NULL),

  ('Generate CMA — Spruce Blvd',
   'Comparable market analysis once assessment data is complete.',
   'pending', 'medium', 'listing', '2026-03-28',
   'a0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', NULL),

  ('Submit Birch Lane to MLS',
   'Once photos are done and reviewed, submit to MLS board.',
   'pending', 'high', 'listing', '2026-03-30',
   'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', NULL),

  ('Schedule showing for Omar Hassan',
   'Omar interested in Cedar Drive and Waterfront Place. Coordinate both.',
   'pending', 'medium', 'showing', '2026-03-25',
   'b0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', NULL),

  ('Prepare offer docs for Cedar Drive',
   'If Rodriguez family proceeds, have CPS ready.',
   'pending', 'low', 'document', '2026-04-01',
   'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', NULL),

  ('Home inspection coordination — Oak Ave',
   'Schedule home inspection before subject removal date.',
   'pending', 'urgent', 'inspection', '2026-03-25',
   'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', NULL),

  ('Marketing review for Waterfront Place',
   'Review feature sheets, virtual tour, and social media plan for luxury listing.',
   'in_progress', 'high', 'marketing', '2026-03-22',
   'a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000007', NULL),

  ('Contact Amanda Foster re: showing schedule',
   'Confirm Saturday morning showings for East Van properties.',
   'pending', 'medium', 'showing', '2026-03-20',
   'b0000000-0000-0000-0000-000000000002', NULL, NULL),

  ('Qualification call with Kevin Nakamura',
   'New lead — determine budget, timeline, and area preferences.',
   'pending', 'medium', 'follow_up', '2026-03-21',
   'b0000000-0000-0000-0000-000000000001', NULL, NULL),

  ('Send referral thank-you to Kims',
   'Thomas mentioned referring friends. Send a small gift.',
   'pending', 'low', 'general', '2026-04-01',
   'b0000000-0000-0000-0000-000000000005', NULL, NULL);

-- ============================================================
-- 8. FORM TEMPLATES
-- ============================================================
INSERT INTO form_templates (form_key, form_name, organization, version, pdf_url, field_mapping, is_public) VALUES
  ('fintrac', 'FINTRAC Individual Identification', 'FINTRAC', '2024', '/forms/templates/fintrac.pdf', '{"full_name": "seller_name", "address": "property_address", "date": "current_date"}', true),
  ('dorts', 'Disclosure of Representation in Trading Services', 'BCREA', '2024', '/forms/templates/dorts.pdf', '{"agent_name": "agent_name", "client_name": "seller_name", "property": "property_address"}', true),
  ('pds', 'Property Disclosure Statement', 'BCREA', '2024', '/forms/templates/pds.pdf', '{"seller_name": "seller_name", "property_address": "property_address"}', true),
  ('mlc', 'Multiple Listing Contract', 'BCREA', '2024', '/forms/templates/mlc.pdf', '{"seller_name": "seller_name", "property_address": "property_address", "list_price": "list_price"}', true),
  ('cps', 'Contract of Purchase and Sale', 'BCREA', '2024', '/forms/templates/cps.pdf', '{"buyer_name": "buyer_name", "seller_name": "seller_name", "property_address": "property_address", "purchase_price": "purchase_price"}', true);

-- ============================================================
-- 9. FORM SUBMISSIONS — various draft/completed states
-- ============================================================
INSERT INTO form_submissions (listing_id, form_key, form_data, status) VALUES
  -- Listing 1 (SOLD): all forms completed
  ('c0000000-0000-0000-0000-000000000001', 'fintrac', '{"seller_name": "Margaret Chen", "property_address": "1234 Maple Street", "id_type": "Passport", "id_number": "GA123456"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000001', 'dorts', '{"agent_name": "Demo Agent", "client_name": "Margaret Chen", "property": "1234 Maple Street"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000001', 'pds', '{"seller_name": "Margaret Chen", "property_address": "1234 Maple Street", "known_defects": "None"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000001', 'mlc', '{"seller_name": "Margaret Chen", "property_address": "1234 Maple Street", "list_price": "1289000"}', 'completed'),

  -- Listing 2 (PENDING): forms completed
  ('c0000000-0000-0000-0000-000000000002', 'fintrac', '{"seller_name": "David & Priya Patel", "property_address": "567 Oak Avenue", "id_type": "Drivers License"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000002', 'dorts', '{"agent_name": "Demo Agent", "client_name": "David & Priya Patel", "property": "567 Oak Avenue"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000002', 'pds', '{"seller_name": "David & Priya Patel", "property_address": "567 Oak Avenue"}', 'completed'),

  -- Listing 5 (Form Gen stage): FINTRAC done, rest in draft
  ('c0000000-0000-0000-0000-000000000005', 'fintrac', '{"seller_name": "James & Lisa Wong", "property_address": "222 Elm Court", "id_type": "Passport"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000005', 'dorts', '{"agent_name": "Demo Agent", "client_name": "James & Lisa Wong"}', 'draft'),
  ('c0000000-0000-0000-0000-000000000005', 'pds', '{"seller_name": "James & Lisa Wong"}', 'draft'),

  -- Listing 7 (Luxury): all completed
  ('c0000000-0000-0000-0000-000000000007', 'fintrac', '{"seller_name": "Michael Thompson", "property_address": "1 Waterfront Place", "id_type": "Passport", "id_number": "MT789012"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000007', 'dorts', '{"agent_name": "Demo Agent", "client_name": "Michael Thompson", "property": "1 Waterfront Place"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000007', 'pds', '{"seller_name": "Michael Thompson", "property_address": "1 Waterfront Place", "known_defects": "None"}', 'completed'),
  ('c0000000-0000-0000-0000-000000000007', 'mlc', '{"seller_name": "Michael Thompson", "property_address": "1 Waterfront Place", "list_price": "3450000"}', 'completed');
