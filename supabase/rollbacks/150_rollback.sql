-- Rollback for migration 150
DROP FUNCTION IF EXISTS compliance_audit_log_verify_chain(bigint, int);
