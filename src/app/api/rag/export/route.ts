// ============================================================
// PIPEDA Right of Access — Export all RAG data for current user
// ============================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { redactPII } from '@/lib/rag/pii-redactor';
import { logAudit } from '@/lib/rag/feedback';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const userEmail = session.user.email;
  const isAdmin = (session.user as { role?: string }).role === 'admin';
  const db = isAdmin
    ? createAdminClient()
    : (await getAuthenticatedTenantClient()).raw;

  // 1. Chat sessions + messages
  const { data: sessions } = await db
    .from('rag_chat_sessions')
    .select('id, created_at, ui_context, tone_preference, messages')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });

  // 2. Feedback
  const { data: feedback } = await db
    .from('rag_feedback')
    .select('id, session_id, message_index, rating, feedback_reason, feedback_text, created_at')
    .in('session_id', (sessions ?? []).map((s) => s.id))
    .order('created_at', { ascending: false });

  // 3. Audit logs (redacted — PII must not be exported from audit trail)
  const { data: rawAudits } = await db
    .from('rag_audit_log')
    .select('id, session_id, intent, model_tier, latency_ms, guardrail_triggered, query_text, response_text, created_at')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false });

  const audits = (rawAudits ?? []).map((a) => ({
    ...a,
    query_text: a.query_text ? redactPII(a.query_text).redacted : null,
    response_text: a.response_text ? redactPII(a.response_text).redacted : null,
  }));

  // 4. Log the export request itself
  logAudit(db, {
    userEmail,
    queryText: '[PIPEDA DATA EXPORT REQUEST]',
    intent: 'data_export',
    modelTier: undefined,
    responseText: `Exported ${sessions?.length ?? 0} sessions, ${feedback?.length ?? 0} feedback, ${audits.length} audit entries`,
  }).catch(() => {});

  return NextResponse.json({
    export_date: new Date().toISOString(),
    user_email: userEmail,
    chat_sessions: sessions ?? [],
    feedback: feedback ?? [],
    audit_logs: audits,
  });
}
