-- Migration 150: Server-side audit-chain verifier (SOC 2 CC7.2)
--
-- Why this exists:
--   The BEFORE-INSERT trigger in migration 146 computes row_hash from a
--   canonical concat of fields. The verifier in src/lib/audit-chain.ts
--   originally re-implemented that canonicalization in TypeScript and
--   compared hashes client-side. Two formats diverged in practice:
--     - Postgres jsonb::text emits '{"k": v}' (space after colon).
--       JSON.stringify emits '{"k":v}' (no space).
--     - Postgres timestamptz::text emits '2026-04-25 18:25:36.336508+00'.
--       Supabase JS returns ISO-8601 '2026-04-25T18:25:36.336508+00:00'.
--   Result: every row with non-empty metadata flagged as a chain break,
--   producing a false positive on the daily integrity check.
--
-- Fix:
--   Single source of truth for the canonical formula — Postgres itself.
--   The verifier function recomputes the hash using the exact same
--   expression as the trigger and returns (stored, expected) pairs.
--   The TS verifier becomes a thin walker that only does string compare.
--
-- If migration 146's trigger formula ever changes, this function MUST
-- change in lockstep. Both expressions are identical here for greppability.

CREATE OR REPLACE FUNCTION compliance_audit_log_verify_chain(
  p_from_sequence bigint DEFAULT 1,
  p_max_rows int DEFAULT 10000
)
RETURNS TABLE (
  out_sequence bigint,
  out_prev_hash text,
  out_prev_hash_expected text,
  out_row_hash text,
  out_row_hash_expected text
)
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
LANGUAGE sql
STABLE
AS $$
  WITH seed AS (
    SELECT row_hash AS seed_hash
    FROM compliance_audit_log
    WHERE sequence < p_from_sequence
    ORDER BY sequence DESC
    LIMIT 1
  ),
  bounded AS (
    SELECT *
    FROM compliance_audit_log
    WHERE sequence >= p_from_sequence
    ORDER BY sequence
    LIMIT p_max_rows
  )
  SELECT
    b.sequence AS out_sequence,
    b.prev_hash AS out_prev_hash,
    COALESCE(
      LAG(b.row_hash) OVER (ORDER BY b.sequence),
      (SELECT seed_hash FROM seed)
    ) AS out_prev_hash_expected,
    b.row_hash AS out_row_hash,
    encode(
      digest(
             COALESCE(b.prev_hash, 'GENESIS')
          || '|' || b.sequence::text
          || '|' || b.occurred_at::text
          || '|' || COALESCE(b.actor_id::text, '')
          || '|' || COALESCE(b.actor_email, '')
          || '|' || b.action
          || '|' || b.category
          || '|' || b.severity
          || '|' || COALESCE(b.resource_type, '')
          || '|' || COALESCE(b.resource_id::text, '')
          || '|' || COALESCE(b.tenant_id::text, '')
          || '|' || COALESCE(b.metadata::text, '{}')
          || '|' || COALESCE(host(b.ip_address), '')
          || '|' || COALESCE(b.request_id, ''),
        'sha256'
      ),
      'hex'
    ) AS out_row_hash_expected
  FROM bounded b
  ORDER BY b.sequence;
$$;

-- service_role only — verifier runs from cron handler with admin client.
REVOKE ALL ON FUNCTION compliance_audit_log_verify_chain(bigint, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION compliance_audit_log_verify_chain(bigint, int) FROM anon;
REVOKE ALL ON FUNCTION compliance_audit_log_verify_chain(bigint, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION compliance_audit_log_verify_chain(bigint, int) TO service_role;

COMMENT ON FUNCTION compliance_audit_log_verify_chain(bigint, int) IS
  'SOC 2 CC7.2 audit chain verifier. Returns (sequence, prev_hash, prev_hash_expected, row_hash, row_hash_expected) for each row in [p_from_sequence, p_from_sequence + p_max_rows). Caller compares stored vs expected. Canonical formula must match the BEFORE-INSERT trigger in migration 146.';
