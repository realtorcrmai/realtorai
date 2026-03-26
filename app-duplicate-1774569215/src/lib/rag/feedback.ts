// ============================================================
// Feedback — thumbs up/down + audit logging
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { FeedbackRequest, QueryPlan } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Save user feedback (thumbs up/down) for a chat response.
 */
export async function saveFeedback(feedback: FeedbackRequest): Promise<string> {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('rag_feedback')
    .insert({
      session_id: feedback.session_id,
      message_index: feedback.message_index,
      rating: feedback.rating,
      feedback_text: feedback.feedback_text || null,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to save feedback: ${error.message}`);
  return data.id;
}

/**
 * Log a RAG query to the audit log for debugging and compliance.
 */
export async function logAudit(params: {
  sessionId?: string;
  userEmail?: string;
  queryText: string;
  intent?: string;
  queryPlan?: QueryPlan;
  retrievedIds?: string[];
  retrievedScores?: number[];
  modelTier?: string;
  responseText?: string;
  latencyMs?: number;
  guardrailTriggered?: string;
}): Promise<void> {
  const admin = getAdmin();
  await admin.from('rag_audit_log').insert({
    session_id: params.sessionId || null,
    user_email: params.userEmail || null,
    query_text: params.queryText,
    intent: params.intent || null,
    query_plan: params.queryPlan || null,
    retrieved_ids: params.retrievedIds || null,
    retrieved_scores: params.retrievedScores || null,
    model_tier: params.modelTier || null,
    response_text: params.responseText?.slice(0, 5000) || null, // cap at 5K chars
    latency_ms: params.latencyMs || null,
    guardrail_triggered: params.guardrailTriggered || null,
  });
}

/**
 * Get feedback stats for a session.
 */
export async function getFeedbackStats(sessionId: string): Promise<{
  positive: number;
  negative: number;
  total: number;
}> {
  const admin = getAdmin();
  const { data } = await admin
    .from('rag_feedback')
    .select('rating')
    .eq('session_id', sessionId);

  const ratings = data ?? [];
  return {
    positive: ratings.filter((r: { rating: string }) => r.rating === 'positive').length,
    negative: ratings.filter((r: { rating: string }) => r.rating === 'negative').length,
    total: ratings.length,
  };
}
