-- Rollback for migration 146
-- WARNING: Dropping compliance_audit_log destroys all SOC 2 evidence.
-- Before running in any environment with real audit entries, export
-- to cold storage first.

DROP TRIGGER IF EXISTS compliance_audit_log_no_update ON compliance_audit_log;
DROP TRIGGER IF EXISTS compliance_audit_log_no_delete ON compliance_audit_log;
DROP FUNCTION IF EXISTS compliance_audit_log_reject_mutations();
DROP TABLE IF EXISTS compliance_audit_log;
