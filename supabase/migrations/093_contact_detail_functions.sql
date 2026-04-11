-- ============================================================
-- Migration 093: Contact Detail Database Functions
-- Consolidates ~20 individual queries into 2 RPC calls
-- for the contact detail page performance optimization.
-- ============================================================

-- ── Function 1: get_contact_detail ──────────────────────────
-- Returns core contact data + direct relations in one call.
-- Consolidates: communications, tasks, documents, dates,
-- family, context, portfolio, journey, household, referred-by
-- ============================================================

CREATE OR REPLACE FUNCTION get_contact_detail(
  p_contact_id uuid,
  p_realtor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact jsonb;
  v_result jsonb;
  v_household_id uuid;
BEGIN
  -- 1. Contact
  SELECT to_jsonb(c.*) INTO v_contact
  FROM contacts c
  WHERE c.id = p_contact_id AND c.realtor_id = p_realtor_id;

  IF v_contact IS NULL THEN
    RETURN NULL;
  END IF;

  v_household_id := (v_contact->>'household_id')::uuid;

  -- Build result with all sub-queries in one go
  SELECT jsonb_build_object(
    'contact', v_contact,

    -- Referred-by name
    'referred_by_name', (
      SELECT c2.name FROM contacts c2
      WHERE c2.id = (v_contact->>'referred_by_id')::uuid
        AND c2.realtor_id = p_realtor_id
    ),

    -- Household detail
    'household', CASE WHEN v_household_id IS NOT NULL THEN (
      SELECT jsonb_build_object('id', h.id, 'name', h.name, 'address', h.address)
      FROM households h
      WHERE h.id = v_household_id AND h.realtor_id = p_realtor_id
    ) ELSE NULL END,

    -- Household members
    'household_members', CASE WHEN v_household_id IS NOT NULL THEN (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cm.id, 'name', cm.name, 'type', cm.type
      ) ORDER BY cm.name), '[]'::jsonb)
      FROM contacts cm
      WHERE cm.household_id = v_household_id AND cm.realtor_id = p_realtor_id
    ) ELSE '[]'::jsonb END,

    -- Contact journey
    'journey', (
      SELECT to_jsonb(cj.*) FROM contact_journeys cj
      WHERE cj.contact_id = p_contact_id AND cj.realtor_id = p_realtor_id
      LIMIT 1
    ),

    -- Communications (last 50)
    'communications', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', co.id,
        'contact_id', co.contact_id,
        'direction', co.direction,
        'channel', co.channel,
        'body', co.body,
        'related_id', co.related_id,
        'created_at', co.created_at
      ) ORDER BY co.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT * FROM communications
        WHERE contact_id = p_contact_id AND realtor_id = p_realtor_id
        ORDER BY created_at DESC LIMIT 50
      ) co
    ),

    -- Tasks
    'tasks', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', t.id,
        'contact_id', t.contact_id,
        'title', t.title,
        'status', t.status,
        'priority', t.priority,
        'category', t.category,
        'due_date', t.due_date,
        'notes', t.description,
        'completed_at', t.completed_at,
        'created_at', t.created_at
      ) ORDER BY t.due_date ASC NULLS LAST), '[]'::jsonb)
      FROM tasks t
      WHERE t.contact_id = p_contact_id AND t.realtor_id = p_realtor_id
    ),

    -- Contact documents
    'documents', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', d.id,
        'contact_id', d.contact_id,
        'doc_type', d.doc_type,
        'file_name', d.file_name,
        'file_url', d.file_url,
        'uploaded_at', d.uploaded_at
      ) ORDER BY d.uploaded_at DESC), '[]'::jsonb)
      FROM contact_documents d
      WHERE d.contact_id = p_contact_id AND d.realtor_id = p_realtor_id
    ),

    -- Contact dates
    'dates', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cd.id,
        'contact_id', cd.contact_id,
        'label', cd.label,
        'date', cd.date,
        'notes', cd.notes
      ) ORDER BY cd.date ASC), '[]'::jsonb)
      FROM contact_dates cd
      WHERE cd.contact_id = p_contact_id AND cd.realtor_id = p_realtor_id
    ),

    -- Family members
    'family_members', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', fm.id,
        'contact_id', fm.contact_id,
        'name', fm.name,
        'relationship', fm.relationship,
        'phone', fm.phone,
        'email', fm.email,
        'notes', fm.notes,
        'created_at', fm.created_at
      ) ORDER BY fm.created_at ASC), '[]'::jsonb)
      FROM contact_family_members fm
      WHERE fm.contact_id = p_contact_id AND fm.realtor_id = p_realtor_id
    ),

    -- Contact context entries
    'context_entries', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cx.id,
        'context_type', cx.context_type,
        'text', cx.text,
        'is_resolved', cx.is_resolved,
        'resolved_note', cx.resolved_note,
        'created_at', cx.created_at
      ) ORDER BY cx.created_at DESC), '[]'::jsonb)
      FROM contact_context cx
      WHERE cx.contact_id = p_contact_id AND cx.realtor_id = p_realtor_id
    ),

    -- Portfolio items
    'portfolio', (
      SELECT COALESCE(jsonb_agg(to_jsonb(cp.*) ORDER BY cp.purchase_date DESC NULLS LAST), '[]'::jsonb)
      FROM contact_portfolio cp
      WHERE cp.contact_id = p_contact_id AND cp.realtor_id = p_realtor_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;


-- ── Function 2: get_contact_network ─────────────────────────
-- Returns relationships, referrals, enrollments+steps,
-- and newsletters+events in one call.
-- ============================================================

CREATE OR REPLACE FUNCTION get_contact_network(
  p_contact_id uuid,
  p_realtor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- Relationships (both directions) with contact names
    'relationships', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', cr.id,
        'contact_a_id', cr.contact_a_id,
        'contact_b_id', cr.contact_b_id,
        'relationship_type', cr.relationship_type,
        'relationship_label', cr.relationship_label,
        'created_at', cr.created_at,
        'contact_a', jsonb_build_object('id', ca.id, 'name', ca.name, 'type', ca.type),
        'contact_b', jsonb_build_object('id', cb.id, 'name', cb.name, 'type', cb.type)
      )), '[]'::jsonb)
      FROM contact_relationships cr
      JOIN contacts ca ON ca.id = cr.contact_a_id
      JOIN contacts cb ON cb.id = cr.contact_b_id
      WHERE (cr.contact_a_id = p_contact_id OR cr.contact_b_id = p_contact_id)
        AND cr.realtor_id = p_realtor_id
    ),

    -- Referrals as referrer
    'referrals_as_referrer', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'referred_by_contact_id', r.referred_by_contact_id,
        'referred_client_contact_id', r.referred_client_contact_id,
        'referral_date', r.referral_date,
        'referral_type', r.referral_type,
        'status', r.status,
        'referral_fee_percent', r.referral_fee_percent,
        'notes', r.notes,
        'closed_deal_id', r.closed_deal_id,
        'created_at', r.created_at,
        'referred_client', jsonb_build_object('id', rc.id, 'name', rc.name, 'type', rc.type),
        'closed_deal', CASE WHEN l.id IS NOT NULL THEN jsonb_build_object('id', l.id, 'address', l.address) ELSE NULL END
      ) ORDER BY r.referral_date DESC), '[]'::jsonb)
      FROM referrals r
      JOIN contacts rc ON rc.id = r.referred_client_contact_id
      LEFT JOIN listings l ON l.id = r.closed_deal_id
      WHERE r.referred_by_contact_id = p_contact_id AND r.realtor_id = p_realtor_id
    ),

    -- Referrals as referred
    'referrals_as_referred', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'referred_by_contact_id', r.referred_by_contact_id,
        'referred_client_contact_id', r.referred_client_contact_id,
        'referral_date', r.referral_date,
        'referral_type', r.referral_type,
        'status', r.status,
        'referral_fee_percent', r.referral_fee_percent,
        'notes', r.notes,
        'closed_deal_id', r.closed_deal_id,
        'created_at', r.created_at,
        'referrer', jsonb_build_object('id', rr.id, 'name', rr.name, 'type', rr.type),
        'closed_deal', CASE WHEN l.id IS NOT NULL THEN jsonb_build_object('id', l.id, 'address', l.address) ELSE NULL END
      ) ORDER BY r.referral_date DESC), '[]'::jsonb)
      FROM referrals r
      JOIN contacts rr ON rr.id = r.referred_by_contact_id
      LEFT JOIN listings l ON l.id = r.closed_deal_id
      WHERE r.referred_client_contact_id = p_contact_id AND r.realtor_id = p_realtor_id
    ),

    -- Workflow enrollments with workflow info + steps
    'enrollments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', we.id,
        'workflow_id', we.workflow_id,
        'contact_id', we.contact_id,
        'status', we.status,
        'current_step', we.current_step,
        'next_run_at', we.next_run_at,
        'started_at', we.started_at,
        'completed_at', we.completed_at,
        'exit_reason', we.exit_reason,
        'created_at', we.created_at,
        'workflows', jsonb_build_object('id', w.id, 'name', w.name, 'slug', w.slug),
        'steps', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ws.id,
            'workflow_id', ws.workflow_id,
            'step_order', ws.step_order,
            'name', ws.name,
            'action_type', ws.action_type,
            'delay_minutes', ws.delay_minutes,
            'delay_unit', ws.delay_unit,
            'delay_value', ws.delay_value,
            'exit_on_reply', ws.exit_on_reply
          ) ORDER BY ws.step_order), '[]'::jsonb)
          FROM workflow_steps ws WHERE ws.workflow_id = we.workflow_id
        )
      ) ORDER BY we.created_at DESC), '[]'::jsonb)
      FROM workflow_enrollments we
      JOIN workflows w ON w.id = we.workflow_id
      WHERE we.contact_id = p_contact_id AND we.realtor_id = p_realtor_id
    ),

    -- Newsletters with events
    'newsletters', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', n.id,
        'subject', n.subject,
        'email_type', n.email_type,
        'status', n.status,
        'sent_at', n.sent_at,
        'created_at', n.created_at,
        'quality_score', n.quality_score,
        'ai_context', n.ai_context,
        'events', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', ne.id,
            'newsletter_id', ne.newsletter_id,
            'event_type', ne.event_type,
            'metadata', ne.metadata,
            'created_at', ne.created_at
          )), '[]'::jsonb)
          FROM newsletter_events ne WHERE ne.newsletter_id = n.id
        )
      ) ORDER BY n.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT * FROM newsletters
        WHERE contact_id = p_contact_id AND realtor_id = p_realtor_id
        ORDER BY created_at DESC LIMIT 20
      ) n
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_contact_detail(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_contact_network(uuid, uuid) TO authenticated, anon, service_role;
