// ============================================================
// Data Retention — PIPEDA-compliant retention enforcement
// ============================================================
//
// Call `enforceRetention()` from a daily cron job.
// Recommended cron schedule: daily at 3:00 AM UTC
//   POST /api/cron/retention  (Authorization: Bearer $CRON_SECRET)
//
// Retention periods are defined by PIPEDA/FINTRAC requirements:
//   - Chat sessions: 90 days (no compliance requirement to keep longer)
//   - Audit logs: 365 days (compliance audit trail)
//   - Feedback: 365 days (quality tracking)
//   - Embeddings: indefinite (kept as long as source record exists)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export const RETENTION_POLICY = {
  chat_sessions: 90,       // days — delete sessions older than 90 days
  audit_logs: 365,         // days — keep for 1 year (compliance requirement)
  feedback: 365,           // days — keep for 1 year
  embeddings: 'indefinite' as const, // kept as long as source record exists
};

/**
 * Delete records older than their retention period.
 * Returns counts of deleted records per table.
 */
export async function enforceRetention(db: SupabaseClient): Promise<{
  sessions_deleted: number;
  audits_deleted: number;
  feedback_deleted: number;
}> {
  const now = new Date();

  // Chat sessions older than 90 days
  const sessionCutoff = new Date(now.getTime() - RETENTION_POLICY.chat_sessions * 24 * 60 * 60 * 1000);
  const { data: deletedSessions } = await db
    .from('rag_chat_sessions')
    .delete()
    .lt('created_at', sessionCutoff.toISOString())
    .select('id');

  // Audit logs older than 365 days
  const auditCutoff = new Date(now.getTime() - RETENTION_POLICY.audit_logs * 24 * 60 * 60 * 1000);
  const { data: deletedAudits } = await db
    .from('rag_audit_log')
    .delete()
    .lt('created_at', auditCutoff.toISOString())
    .select('id');

  // Feedback older than 365 days
  const feedbackCutoff = new Date(now.getTime() - RETENTION_POLICY.feedback * 24 * 60 * 60 * 1000);
  const { data: deletedFeedback } = await db
    .from('rag_feedback')
    .delete()
    .lt('created_at', feedbackCutoff.toISOString())
    .select('id');

  return {
    sessions_deleted: deletedSessions?.length ?? 0,
    audits_deleted: deletedAudits?.length ?? 0,
    feedback_deleted: deletedFeedback?.length ?? 0,
  };
}
