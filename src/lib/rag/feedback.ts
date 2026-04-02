// ============================================================
// Feedback — thumbs up/down + audit logging + pipeline telemetry
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedbackRequest, QueryPlan } from './types';

// --- Structured Pipeline Logging ---

interface PipelineStep {
  step: string;
  startMs: number;
  endMs?: number;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

/**
 * Create a pipeline logger for a single RAG request.
 * Tracks timing and metadata per step (plan, retrieve, synthesize, validate).
 * Call summary() at the end to get a structured log entry.
 */
export function createPipelineLogger(sessionId: string) {
  const steps: PipelineStep[] = [];
  const requestStart = Date.now();

  return {
    /** Start a new pipeline step */
    startStep(step: string, meta?: Record<string, unknown>) {
      steps.push({ step, startMs: Date.now(), meta });
    },

    /** End the current (last) step */
    endStep(meta?: Record<string, unknown>) {
      const current = steps[steps.length - 1];
      if (current && !current.endMs) {
        current.endMs = Date.now();
        current.durationMs = current.endMs - current.startMs;
        if (meta) current.meta = { ...current.meta, ...meta };
      }
    },

    /** Get a structured summary of all steps */
    summary() {
      const totalMs = Date.now() - requestStart;
      return {
        sessionId,
        totalMs,
        steps: steps.map((s) => ({
          step: s.step,
          durationMs: s.durationMs ?? Date.now() - s.startMs,
          meta: s.meta,
        })),
      };
    },

    /** Log the full summary to console (structured JSON) */
    log() {
      const s = this.summary();
      console.log(`[RAG] ${s.sessionId} | ${s.totalMs}ms | ${s.steps.map((st) => `${st.step}:${st.durationMs}ms`).join(' → ')}`);
    },
  };
}

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
  realtorId?: string;
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
    realtor_id: params.realtorId || null,
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
