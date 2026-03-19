-- Fix stage_bar inconsistency: contacts enrolled in workflows
-- should have stage_bar matching their workflow stage.

-- Post-Close Buyer → stage_bar = 'closed'
UPDATE contacts c
SET stage_bar = 'closed'
FROM workflow_enrollments we
JOIN workflows w ON w.id = we.workflow_id
WHERE we.contact_id = c.id
  AND w.slug = 'post_close_buyer'
  AND we.status IN ('active', 'paused')
  AND (c.stage_bar IS NULL OR c.stage_bar != 'closed');

-- Post-Close Seller → stage_bar = 'closed'
UPDATE contacts c
SET stage_bar = 'closed'
FROM workflow_enrollments we
JOIN workflows w ON w.id = we.workflow_id
WHERE we.contact_id = c.id
  AND w.slug = 'post_close_seller'
  AND we.status IN ('active', 'paused')
  AND (c.stage_bar IS NULL OR c.stage_bar != 'closed');

-- Buyer Nurture → stage_bar = 'qualified' (for buyers)
UPDATE contacts c
SET stage_bar = 'qualified'
FROM workflow_enrollments we
JOIN workflows w ON w.id = we.workflow_id
WHERE we.contact_id = c.id
  AND w.slug = 'buyer_nurture'
  AND we.status IN ('active', 'paused')
  AND c.type = 'buyer'
  AND (c.stage_bar IS NULL OR c.stage_bar = 'new');

-- Lead Re-Engagement → stage_bar = 'cold'
UPDATE contacts c
SET stage_bar = 'cold'
FROM workflow_enrollments we
JOIN workflows w ON w.id = we.workflow_id
WHERE we.contact_id = c.id
  AND w.slug = 'lead_reengagement'
  AND we.status IN ('active', 'paused')
  AND (c.stage_bar IS NULL OR c.stage_bar = 'new');

-- Open House Follow-Up → stage_bar = 'active_search' (buyer) / 'active_listing' (seller)
UPDATE contacts c
SET stage_bar = CASE WHEN c.type = 'seller' THEN 'active_listing' ELSE 'active_search' END
FROM workflow_enrollments we
JOIN workflows w ON w.id = we.workflow_id
WHERE we.contact_id = c.id
  AND w.slug = 'open_house_followup'
  AND we.status IN ('active', 'paused')
  AND (c.stage_bar IS NULL OR c.stage_bar = 'new');

-- Lifecycle workflows: sync stage based on current milestone step
-- Buyer lifecycle: match step name to stage
UPDATE contacts c
SET stage_bar = CASE
  WHEN ws.name = 'Closing Complete' THEN 'closed'
  WHEN ws.name = 'Offer Submitted' THEN 'under_contract'
  WHEN ws.name = 'Property Showings' THEN 'active_search'
  WHEN ws.name = 'Preferences Set' THEN 'qualified'
  ELSE 'new'
END
FROM workflow_enrollments we
JOIN workflows w ON w.id = we.workflow_id
JOIN workflow_steps ws ON ws.workflow_id = w.id AND ws.step_order = we.current_step
WHERE we.contact_id = c.id
  AND w.slug = 'buyer_lifecycle'
  AND we.status IN ('active', 'paused')
  AND c.type = 'buyer';

-- Seller lifecycle: match step name to stage
UPDATE contacts c
SET stage_bar = CASE
  WHEN ws.name = 'Closing Complete' THEN 'closed'
  WHEN ws.name = 'Offer Accepted' THEN 'under_contract'
  WHEN ws.name = 'Property Listed' THEN 'active_listing'
  WHEN ws.name = 'Listing Agreement' THEN 'qualified'
  ELSE 'new'
END
FROM workflow_enrollments we
JOIN workflows w ON w.id = we.workflow_id
JOIN workflow_steps ws ON ws.workflow_id = w.id AND ws.step_order = we.current_step
WHERE we.contact_id = c.id
  AND w.slug = 'seller_lifecycle'
  AND we.status IN ('active', 'paused')
  AND c.type = 'seller';
