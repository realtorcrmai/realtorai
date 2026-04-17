-- =============================================================================
-- Migration 118: Atomic increment functions for editorial analytics
-- Description: Prevents race conditions in the Resend webhook handler.
--   The old handler did SELECT → compute → UPDATE which loses counts under
--   concurrent events. These RPC functions execute the increment atomically
--   inside a single Postgres UPDATE ... SET col = col + 1 statement.
-- Created: 2026-04-15
-- =============================================================================

-- ── increment_editorial_opens ─────────────────────────────────────────────────
-- Atomically increments opens (and per-variant opens) on editorial_analytics.
-- Also recomputes open_rate in the same UPDATE.

CREATE OR REPLACE FUNCTION increment_editorial_opens(
  p_edition_id uuid,
  p_variant    text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE editorial_analytics
  SET
    opens           = opens + 1,
    variant_a_opens = CASE WHEN p_variant = 'a' THEN variant_a_opens + 1 ELSE variant_a_opens END,
    variant_b_opens = CASE WHEN p_variant = 'b' THEN variant_b_opens + 1 ELSE variant_b_opens END,
    open_rate       = CASE
                        WHEN recipients > 0
                        THEN ROUND((opens + 1)::numeric / recipients * 100, 2)
                        ELSE 0
                      END,
    updated_at      = now()
  WHERE edition_id = p_edition_id;
END;
$$;

-- ── increment_editorial_clicks ────────────────────────────────────────────────
-- Atomically increments clicks, per-variant clicks, block_clicks JSONB map,
-- cta_clicks JSONB map, and (conditionally) high_intent_clicks.

CREATE OR REPLACE FUNCTION increment_editorial_clicks(
  p_edition_id uuid,
  p_variant    text DEFAULT NULL,
  p_block_id   text DEFAULT 'unknown',
  p_cta_type   text DEFAULT 'link'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE editorial_analytics
  SET
    clicks           = clicks + 1,
    variant_a_clicks = CASE WHEN p_variant = 'a' THEN variant_a_clicks + 1 ELSE variant_a_clicks END,
    variant_b_clicks = CASE WHEN p_variant = 'b' THEN variant_b_clicks + 1 ELSE variant_b_clicks END,
    click_rate       = CASE
                         WHEN recipients > 0
                         THEN ROUND((clicks + 1)::numeric / recipients * 100, 2)
                         ELSE 0
                       END,
    -- Increment block_clicks[p_block_id] atomically
    block_clicks     = jsonb_set(
                         block_clicks,
                         ARRAY[p_block_id],
                         to_jsonb(COALESCE((block_clicks ->> p_block_id)::int, 0) + 1)
                       ),
    -- Increment cta_clicks[p_cta_type] atomically
    cta_clicks       = jsonb_set(
                         cta_clicks,
                         ARRAY[p_cta_type],
                         to_jsonb(COALESCE((cta_clicks ->> p_cta_type)::int, 0) + 1)
                       ),
    -- Only increment high_intent_clicks for CTA types that signal purchase intent
    high_intent_clicks = CASE
                           WHEN p_cta_type IN ('book_showing', 'request_cma', 'contact_agent')
                           THEN high_intent_clicks + 1
                           ELSE high_intent_clicks
                         END,
    updated_at       = now()
  WHERE edition_id = p_edition_id;
END;
$$;

-- ── increment_editorial_bounces ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_editorial_bounces(p_edition_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE editorial_analytics
  SET bounced    = bounced + 1,
      updated_at = now()
  WHERE edition_id = p_edition_id;
END;
$$;

-- ── increment_editorial_unsubscribes ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_editorial_unsubscribes(p_edition_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE editorial_analytics
  SET unsubscribed = unsubscribed + 1,
      updated_at   = now()
  WHERE edition_id = p_edition_id;
END;
$$;
