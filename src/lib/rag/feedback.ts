// ============================================================
// Feedback — thumbs up/down + audit logging
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedbackRequest, QueryPlan } from './types';

/**
 * Save user feedback (thumbs up/down) for a chat response.
 */
export async function saveFeedback(db: SupabaseClient, feedback: FeedbackRequest): Promise<string> {
  const { data, error } = await db
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
// Cost per 1K tokens (input/output) by model tier
const COST_PER_1K: Record<string, { input: number; output: number }> = {
  haiku: { input: 0.001, output: 0.005 },
  sonnet: { input: 0.003, output: 0.015 },
  opus: { input: 0.005, output: 0.025 },
};

/**
 * Estimate cost from text lengths. Rough: 1 token ~ 4 chars.
 */
function estimateCost(
  modelTier: string,
  inputChars: number,
  outputChars: number
): number {
  const rates = COST_PER_1K[modelTier] ?? COST_PER_1K.sonnet;
  const inputTokens = inputChars / 4;
  const outputTokens = outputChars / 4;
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

export async function logAudit(db: SupabaseClient, params: {
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

  const cost = params.modelTier
    ? estimateCost(
        params.modelTier,
        params.queryText.length + JSON.stringify(params.queryPlan ?? {}).length,
        params.responseText?.length ?? 0
      )
    : null;

  await db.from('rag_audit_log').insert({
    session_id: params.sessionId || null,
    user_email: params.userEmail || null,
    query_text: params.queryText,
    intent: params.intent || null,
    query_plan: params.queryPlan || null,
    retrieved_ids: params.retrievedIds || null,
    retrieved_scores: params.retrievedScores || null,
    model_tier: params.modelTier || null,
    response_text: params.responseText?.slice(0, 5000) || null,
    latency_ms: params.latencyMs || null,
    guardrail_triggered: params.guardrailTriggered || null,
    estimated_cost_usd: cost,
  });
}

/**
 * Get feedback stats for a session.
 */
export async function getFeedbackStats(db: SupabaseClient, sessionId: string): Promise<{
  positive: number;
  negative: number;
  total: number;
}> {
  const { data } = await db
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
