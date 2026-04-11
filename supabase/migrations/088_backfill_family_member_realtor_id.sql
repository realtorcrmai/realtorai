-- ============================================================
-- 088: Backfill realtor_id on contact sub-tables
-- API routes using createAdminClient() inserted rows without
-- realtor_id, making them invisible to tenant-scoped queries.
-- ============================================================

-- contact_family_members
UPDATE contact_family_members cfm
SET realtor_id = c.realtor_id
FROM contacts c
WHERE cfm.contact_id = c.id
  AND cfm.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- contact_important_dates
UPDATE contact_important_dates cid
SET realtor_id = c.realtor_id
FROM contacts c
WHERE cid.contact_id = c.id
  AND cid.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- contact_context
UPDATE contact_context cc
SET realtor_id = c.realtor_id
FROM contacts c
WHERE cc.contact_id = c.id
  AND cc.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- contact_instructions
UPDATE contact_instructions ci
SET realtor_id = c.realtor_id
FROM contacts c
WHERE ci.contact_id = c.id
  AND ci.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- contact_watchlist
UPDATE contact_watchlist cw
SET realtor_id = c.realtor_id
FROM contacts c
WHERE cw.contact_id = c.id
  AND cw.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- communications
UPDATE communications cm
SET realtor_id = c.realtor_id
FROM contacts c
WHERE cm.contact_id = c.id
  AND cm.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- activity_log
UPDATE activity_log al
SET realtor_id = c.realtor_id
FROM contacts c
WHERE al.contact_id = c.id
  AND al.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- tasks
UPDATE tasks t
SET realtor_id = c.realtor_id
FROM contacts c
WHERE t.contact_id = c.id
  AND t.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- contact_journeys
UPDATE contact_journeys cj
SET realtor_id = c.realtor_id
FROM contacts c
WHERE cj.contact_id = c.id
  AND cj.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;

-- outcome_events
UPDATE outcome_events oe
SET realtor_id = c.realtor_id
FROM contacts c
WHERE oe.contact_id = c.id
  AND oe.realtor_id IS NULL
  AND c.realtor_id IS NOT NULL;
