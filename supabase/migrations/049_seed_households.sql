-- ============================================================
-- 049: Seed Household Data
-- Creates households and links contacts, adds relationships.
-- Covers: couples, multi-gen families, business partners,
--         co-buyers, siblings, parent-child, neighbours, referrals.
-- ============================================================

-- ── 1. Create Households ──────────────────────────────────────

INSERT INTO households (id, name, address, notes) VALUES
  -- New households for non-couple contacts
  ('a1000000-0000-0000-0000-000000000009', 'The Sharma Family', '1850 Main Street, Vancouver', 'Priya Sharma (seller) — empty nester considering downsizing'),
  ('a1000000-0000-0000-0000-000000000010', 'The Chen-Yamamoto Household', '3210 West 4th Ave, Vancouver', 'Margaret Chen + Robert Yamamoto — neighbours who both listed through us'),
  ('a1000000-0000-0000-0000-000000000011', 'The Mehta Family', '7800 Boundary Road, Burnaby', 'Raj & Sunita Mehta (sellers) and son Raj Mehta (buyer) — inter-generational'),
  ('a1000000-0000-0000-0000-000000000012', 'The Thompson-Anderson Household', '2200 Oak Street, Vancouver', 'Michael Thompson & Thomas Anderson — investment partners selling 2 properties'),
  ('a1000000-0000-0000-0000-000000000013', 'The Liu-Mitchell Household', '4400 Cambie Street #801, Vancouver', 'Jennifer Liu & Sarah Mitchell — friends co-buying a duplex'),
  ('a1000000-0000-0000-0000-000000000014', 'The Tanaka-Nakamura Family', '5500 Kingsway, Burnaby', 'Yuki Tanaka (seller) & Kevin Nakamura (buyer) — siblings'),
  ('a1000000-0000-0000-0000-000000000015', 'The Hassan Family', '9100 River Road, Richmond', 'Fatima Hassan (seller) & Omar Hassan (buyer) — mother and son')
ON CONFLICT (id) DO NOTHING;


-- ── 2. Link Contacts to Households ────────────────────────────

-- Priya Sharma → Sharma Family
UPDATE contacts SET household_id = 'a1000000-0000-0000-0000-000000000009'
WHERE id = 'a0000000-0000-0000-0000-000000000019' AND household_id IS NULL;

-- Margaret Chen + Robert Yamamoto → Chen-Yamamoto (neighbours)
UPDATE contacts SET household_id = 'a1000000-0000-0000-0000-000000000010'
WHERE id IN ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003') AND household_id IS NULL;

-- Raj & Sunita Mehta (seller) + Raj Mehta (buyer) → Mehta Family
UPDATE contacts SET household_id = 'a1000000-0000-0000-0000-000000000011'
WHERE id IN ('a0000000-0000-0000-0000-00000000000e', 'b0000000-0000-0000-0000-000000000007') AND household_id IS NULL;

-- Michael Thompson + Thomas Anderson → investment partners
UPDATE contacts SET household_id = 'a1000000-0000-0000-0000-000000000012'
WHERE id IN ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-00000000000c') AND household_id IS NULL;

-- Jennifer Liu + Sarah Mitchell → co-buyers
UPDATE contacts SET household_id = 'a1000000-0000-0000-0000-000000000013'
WHERE id IN ('b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005') AND household_id IS NULL;

-- Yuki Tanaka + Kevin Nakamura → siblings
UPDATE contacts SET household_id = 'a1000000-0000-0000-0000-000000000014'
WHERE id IN ('a0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000010') AND household_id IS NULL;

-- Fatima Hassan + Omar Hassan → mother and son
UPDATE contacts SET household_id = 'a1000000-0000-0000-0000-000000000015'
WHERE id IN ('a0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-00000000000d') AND household_id IS NULL;


-- ── 3. Seed Contact Relationships ─────────────────────────────

INSERT INTO contact_relationships (contact_a_id, contact_b_id, relationship_type, relationship_label, notes) VALUES
  -- Parent-child: Raj & Sunita Mehta → son Raj Mehta
  ('a0000000-0000-0000-0000-00000000000e', 'b0000000-0000-0000-0000-000000000007',
   'parent', 'Parents → Son', 'Raj & Sunita selling, son Raj buying his first condo'),

  -- Colleague/partners: Michael Thompson ↔ Thomas Anderson
  ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-00000000000c',
   'colleague', 'Investment Partners', 'Co-own 2 rental properties'),

  -- Friend/co-buyers: Jennifer Liu ↔ Sarah Mitchell
  ('b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005',
   'friend', 'Co-Buyers', 'UBC friends buying duplex together'),

  -- Sibling: Yuki Tanaka ↔ Kevin Nakamura
  ('a0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000010',
   'sibling', 'Brother & Sister', 'Yuki selling to fund renovation, Kevin buying nearby'),

  -- Parent-child: Fatima Hassan → Omar Hassan
  ('a0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-00000000000d',
   'parent', 'Mother → Son', 'Fatima downsizing, Omar buying family home'),

  -- Neighbour: Margaret Chen ↔ Robert Yamamoto
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
   'neighbour', 'Same Block', 'Robert listed after seeing Margaret sale price'),

  -- Friend: Alex Morgan ↔ Diana Prince
  ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   'friend', 'Gym Buddies', 'Alex referred Diana to us'),

  -- Referral: Elena Petrova → Eric Johansson
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000009',
   'friend', 'Seller → Buyer Referral', 'Elena referred Eric after her sale'),

  -- Colleague: Aisha Okafor ↔ Omar Al-Rashid
  ('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000010',
   'colleague', 'Work Colleagues', 'Both at UBC — Aisha referred Omar'),

  -- Spouse: Aiden Patel ↔ Harper Johnson
  ('b0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000013',
   'spouse', 'Married Couple', 'Newly married, first home buyers'),

  -- Friend/referral: Priya Sharma → Stephanie Kim
  ('a0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000015',
   'friend', 'Book Club Friends', 'Priya introduced Stephanie Kim to us')

ON CONFLICT (contact_a_id, contact_b_id) DO NOTHING;
