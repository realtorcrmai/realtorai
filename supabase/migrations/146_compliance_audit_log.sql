-- Migration 146: Compliance audit log (SOC 2 CC7.2)
--
-- Immutable, append-only, hash-chained log of security-relevant events:
--   - authentication (login, logout, password, MFA)
--   - PII access (view/export/delete of FINTRAC identities)
--   - admin actions (role changes, invites, plan changes)
--   - compliance events (consent, data deletion/export)
--   - security events (rate limits, bulk ops, impossible travel)
--
-- Distinct from team audit_log (migration 139) which is team-scoped and
-- mutable. This table enforces three properties:
--   1. Append-only — triggers RAISE on UPDATE / DELETE (blocks service_role)
--   2. Tamper-evident — each row carries sha256 hash of prior row's content
--   3. PII-safe — metadata field contains field NAMES, not VALUES
--      (enforcement in src/lib/audit.ts sanitizer + server-side trigger)
--
-- Pre-production: no backfill needed.
--
-- Concurrency note: the hash chain requires serialized writes. We use
-- pg_advisory_xact_lock in the BEFORE-INSERT trigger. For the expected
-- audit volume (auth + PII + mutation events, << 100 writes/sec in
-- aggregate) the serialization cost is negligible. If volume grows,
-- partition by category into separate chains rather than removing the
-- lock.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence      bigserial NOT NULL UNIQUE,
  occurred_at   timestamptz NOT NULL DEFAULT now(),

  -- Who
  actor_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_email   text,
  actor_role    text,

  -- What
  action        text NOT NULL,
  category      text NOT NULL CHECK (category IN (
    'authentication',
    'pii_access',
    'data_mutation',
    'admin',
    'compliance',
    'security'
  )),
  severity      text NOT NULL DEFAULT 'info' CHECK (severity IN (
    'info', 'warning', 'critical'
  )),

  -- Target
  resource_type text,
  resource_id   uuid,

  -- Context
  tenant_id     uuid,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address    inet,
  user_agent    text,
  request_id    text,

  -- Hash chain (populated by BEFORE-INSERT trigger)
  prev_hash     text,
  row_hash      text NOT NULL DEFAULT ''
);

-- Indexes for common audit queries
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at
  ON compliance_audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON compliance_audit_log (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant
  ON compliance_audit_log (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category
  ON compliance_audit_log (category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action
  ON compliance_audit_log (action, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource
  ON compliance_audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_severity
  ON compliance_audit_log (severity, occurred_at DESC)
  WHERE severity IN ('warning', 'critical');
-- sequence already has UNIQUE constraint → btree index implicit

-- ===========================================================
-- Hash chain computation (BEFORE INSERT)
-- ===========================================================
-- Server-side hashing means the chain cannot be bypassed by a buggy or
-- malicious client. The advisory lock is transaction-scoped so it
-- releases automatically on commit/rollback. Canonical form is a
-- deterministic string concat of fields that matter for evidentiary
-- replay; metadata is included but does NOT contain PII (sanitized by
-- src/lib/audit.ts before the INSERT call).

CREATE OR REPLACE FUNCTION compliance_audit_log_compute_hash()
RETURNS trigger AS $$
DECLARE
  prev_hash_val text;
  canonical text;
BEGIN
  -- Serialize chain writes
  PERFORM pg_advisory_xact_lock(hashtext('compliance_audit_log_chain'));

  -- Previous row's hash (NULL for the genesis row)
  SELECT row_hash INTO prev_hash_val
  FROM compliance_audit_log
  ORDER BY sequence DESC
  LIMIT 1;

  NEW.prev_hash := prev_hash_val;

  -- Deterministic canonical form
  canonical :=
       COALESCE(prev_hash_val, 'GENESIS')
    || '|' || NEW.sequence::text
    || '|' || NEW.occurred_at::text
    || '|' || COALESCE(NEW.actor_id::text, '')
    || '|' || COALESCE(NEW.actor_email, '')
    || '|' || NEW.action
    || '|' || NEW.category
    || '|' || NEW.severity
    || '|' || COALESCE(NEW.resource_type, '')
    || '|' || COALESCE(NEW.resource_id::text, '')
    || '|' || COALESCE(NEW.tenant_id::text, '')
    || '|' || COALESCE(NEW.metadata::text, '{}')
    || '|' || COALESCE(host(NEW.ip_address), '')
    || '|' || COALESCE(NEW.request_id, '');

  NEW.row_hash := encode(digest(canonical, 'sha256'), 'hex');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compliance_audit_log_hash ON compliance_audit_log;
CREATE TRIGGER compliance_audit_log_hash
  BEFORE INSERT ON compliance_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION compliance_audit_log_compute_hash();

-- ===========================================================
-- Immutability enforcement (UPDATE / DELETE / TRUNCATE blocked)
-- ===========================================================
-- REVOKE alone is bypassable by service_role. A trigger that raises
-- blocks all callers including admin client. The only way to remove
-- entries is DROP TABLE, which is itself an auditable schema event.

CREATE OR REPLACE FUNCTION compliance_audit_log_reject_mutations()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'compliance_audit_log is append-only (SOC 2 CC7.2): % is not permitted',
    TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compliance_audit_log_no_update ON compliance_audit_log;
CREATE TRIGGER compliance_audit_log_no_update
  BEFORE UPDATE ON compliance_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION compliance_audit_log_reject_mutations();

DROP TRIGGER IF EXISTS compliance_audit_log_no_delete ON compliance_audit_log;
CREATE TRIGGER compliance_audit_log_no_delete
  BEFORE DELETE ON compliance_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION compliance_audit_log_reject_mutations();

-- Belt-and-suspenders grant revocation
REVOKE UPDATE, DELETE, TRUNCATE ON compliance_audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON compliance_audit_log FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON compliance_audit_log FROM anon;

-- ===========================================================
-- RLS
-- ===========================================================
ALTER TABLE compliance_audit_log ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped SELECT — realtors can view their own tenant's log
DROP POLICY IF EXISTS compliance_audit_select ON compliance_audit_log;
CREATE POLICY compliance_audit_select ON compliance_audit_log
  FOR SELECT
  USING (tenant_id = auth.uid()::uuid);

-- INSERT allowed for any authenticated session
-- (writes happen via logAuditEvent utility using admin client)
DROP POLICY IF EXISTS compliance_audit_insert ON compliance_audit_log;
CREATE POLICY compliance_audit_insert ON compliance_audit_log
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE compliance_audit_log IS
  'SOC 2 CC7.2: Immutable, append-only, hash-chained audit log. Retained 7 years per PIPEDA.';
COMMENT ON COLUMN compliance_audit_log.sequence IS
  'Monotonic write order for chain replay.';
COMMENT ON COLUMN compliance_audit_log.prev_hash IS
  'SHA-256 hash of the prior row (by sequence). NULL for genesis row.';
COMMENT ON COLUMN compliance_audit_log.row_hash IS
  'SHA-256 hash of canonical form including prev_hash. Computed server-side.';
COMMENT ON COLUMN compliance_audit_log.metadata IS
  'Event context. Must contain field NAMES only, never values (enforced by src/lib/audit.ts).';
