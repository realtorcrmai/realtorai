-- 088_trust_level_atomic.sql
-- Atomic trust level promotion/demotion to eliminate TOCTOU race conditions.
-- The TypeScript read-modify-write in trust-level.ts is replaced by single
-- RPC calls that do the increment + level recomputation in one transaction.

-- Promote: atomically increment positive_signals and recompute level.
-- Mirrors computeTrustLevel() thresholds from trust-level.ts:
--   L3: hasClosedDeal AND positive >= 10
--   L2: positive >= 10 AND hasReply AND negative <= 1
--   L1: positive >= 3 AND negative == 0
--   L0: default
-- Level never auto-demotes on a positive signal (uses GREATEST).
CREATE OR REPLACE FUNCTION promote_trust_level(
  p_contact_id uuid,
  p_realtor_id uuid,
  p_positive_increment int DEFAULT 1,
  p_has_reply boolean DEFAULT false,
  p_has_deal boolean DEFAULT false
)
RETURNS TABLE(new_level int, promoted boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_level int;
  v_positive int;
  v_negative int;
  v_computed int;
  v_new_level int;
  v_promoted boolean;
BEGIN
  -- Upsert with advisory lock on the row to serialise concurrent calls
  INSERT INTO contact_trust_levels (contact_id, realtor_id, level, positive_signals, negative_signals)
  VALUES (p_contact_id, p_realtor_id, 0, 0, 0)
  ON CONFLICT (contact_id, realtor_id) DO NOTHING;

  -- Lock the row for update
  SELECT ctl.level, ctl.positive_signals, ctl.negative_signals
    INTO v_old_level, v_positive, v_negative
    FROM contact_trust_levels ctl
   WHERE ctl.contact_id = p_contact_id
     AND ctl.realtor_id = p_realtor_id
     FOR UPDATE;

  v_positive := v_positive + p_positive_increment;

  -- Compute trust level using same thresholds as TypeScript computeTrustLevel
  IF p_has_deal AND v_positive >= 10 THEN
    v_computed := 3;
  ELSIF v_positive >= 10 AND p_has_reply AND v_negative <= 1 THEN
    v_computed := 2;
  ELSIF v_positive >= 3 AND v_negative = 0 THEN
    v_computed := 1;
  ELSE
    v_computed := 0;
  END IF;

  -- Never auto-demote on a positive signal
  v_new_level := GREATEST(v_old_level, v_computed);
  v_promoted := v_new_level > v_old_level;

  UPDATE contact_trust_levels
     SET positive_signals = v_positive,
         level = v_new_level,
         last_promoted_at = CASE WHEN v_promoted THEN now() ELSE last_promoted_at END,
         updated_at = now()
   WHERE contact_trust_levels.contact_id = p_contact_id
     AND contact_trust_levels.realtor_id = p_realtor_id;

  RETURN QUERY SELECT v_new_level, v_promoted;
END;
$$;

-- Demote: atomically increment negative_signals and drop level by 1 (min 0).
CREATE OR REPLACE FUNCTION demote_trust_level(
  p_contact_id uuid,
  p_realtor_id uuid
)
RETURNS TABLE(new_level int, demoted boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_level int;
  v_new_level int;
  v_demoted boolean;
BEGIN
  -- Upsert to ensure row exists
  INSERT INTO contact_trust_levels (contact_id, realtor_id, level, positive_signals, negative_signals)
  VALUES (p_contact_id, p_realtor_id, 0, 0, 0)
  ON CONFLICT (contact_id, realtor_id) DO NOTHING;

  -- Lock the row for update
  SELECT ctl.level
    INTO v_old_level
    FROM contact_trust_levels ctl
   WHERE ctl.contact_id = p_contact_id
     AND ctl.realtor_id = p_realtor_id
     FOR UPDATE;

  v_new_level := GREATEST(0, v_old_level - 1);
  v_demoted := v_new_level < v_old_level;

  UPDATE contact_trust_levels
     SET negative_signals = negative_signals + 1,
         level = v_new_level,
         updated_at = now()
   WHERE contact_trust_levels.contact_id = p_contact_id
     AND contact_trust_levels.realtor_id = p_realtor_id;

  RETURN QUERY SELECT v_new_level, v_demoted;
END;
$$;
