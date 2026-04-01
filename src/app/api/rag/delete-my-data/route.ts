// ============================================================
// PIPEDA Right to Erasure — Delete all RAG data for current user
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { redactPII } from '@/lib/rag/pii-redactor';
import { logAudit } from '@/lib/rag/feedback';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const isAdmin = (session.user as { role?: string }).role === 'admin';
  const db = isAdmin
    ? createAdminClient()
    : (await getAuthenticatedTenantClient()).raw;

  // Require confirmation token in body
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== 'DELETE_MY_DATA') {
    return NextResponse.json(
      { error: 'Confirmation required. Send { "confirm": "DELETE_MY_DATA" } in the request body.' },
      { status: 400 }
    );
  }

  // 1. Get all session IDs for this user
  const { data: sessions } = await db
    .from('rag_chat_sessions')
    .select('id')
    .eq('user_email', userEmail);

  const sessionIds = (sessions ?? []).map((s) => s.id);

  // 2. Delete feedback for user's sessions
  let feedbackDeleted = 0;
  if (sessionIds.length > 0) {
    const { data: deletedFeedback } = await db
      .from('rag_feedback')
      .delete()
      .in('session_id', sessionIds)
      .select('id');
    feedbackDeleted = deletedFeedback?.length ?? 0;
  }

  // 3. Delete chat sessions (includes messages stored in JSONB)
  const { data: deletedSessions } = await db
    .from('rag_chat_sessions')
    .delete()
    .eq('user_email', userEmail)
    .select('id');
  const sessionsDeleted = deletedSessions?.length ?? 0;

  // 4. Audit logs are RETAINED but PII-redacted (compliance requires keeping audit trail)
  const { data: auditRows } = await db
    .from('rag_audit_log')
    .select('id, query_text, response_text, user_email')
    .eq('user_email', userEmail);

  let auditsRedacted = 0;
  for (const row of auditRows ?? []) {
    const redactedQuery = row.query_text ? redactPII(row.query_text).redacted : null;
    const redactedResponse = row.response_text ? redactPII(row.response_text).redacted : null;

    await db
      .from('rag_audit_log')
      .update({
        query_text: redactedQuery,
        response_text: redactedResponse,
        user_email: '[REDACTED]',
      })
      .eq('id', row.id);
    auditsRedacted++;
  }

  // 5. Log the deletion request itself (with redacted email)
  logAudit(db, {
    userEmail: '[REDACTED]',
    queryText: '[PIPEDA DATA DELETION REQUEST]',
    intent: 'data_deletion',
    modelTier: undefined,
    responseText: `Deleted ${sessionsDeleted} sessions, ${feedbackDeleted} feedback. Redacted ${auditsRedacted} audit entries.`,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    deleted: {
      sessions: sessionsDeleted,
      feedback: feedbackDeleted,
    },
    redacted: {
      audit_logs: auditsRedacted,
    },
  });
}
