// ============================================================
// Unified Agent — Feedback & Audit Logging
// ============================================================
// Uses existing rag_feedback and rag_audit_log tables (both have
// realtor_id columns and RLS). The agent reuses these tables to
// avoid schema proliferation — the "source" field distinguishes
// RAG vs unified agent entries.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Feedback — thumbs up/down on agent responses
// ---------------------------------------------------------------------------

/**
 * Submit feedback for a specific agent response.
 *
 * @param db        - Tenant-scoped Supabase client
 * @param sessionId - Agent session UUID
 * @param messageIndex - Zero-based index of the message in the session
 * @param rating    - 'positive' or 'negative'
 * @param comment   - Optional free-text comment from the realtor
 */
export async function submitAgentFeedback(
  db: SupabaseClient,
  sessionId: string,
  messageIndex: number,
  rating: 'positive' | 'negative',
  comment?: string
): Promise<void> {
  const { error } = await db.from('rag_feedback').insert({
    session_id: sessionId,
    message_index: messageIndex,
    rating,
    comment: comment ?? null,
    source: 'unified_agent',
  });

  if (error) {
    console.error('[agent/feedback] Failed to submit feedback:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Audit log — every agent interaction gets logged
// ---------------------------------------------------------------------------

export interface AgentAuditData {
  userMessage: string;
  toolsUsed: string[];
  modelUsed: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  guardrailTriggered?: string;
}

/**
 * Log an audit entry for an agent interaction.
 * Captures the user message, tools invoked, model, token usage,
 * latency, and whether any guardrail was triggered.
 *
 * @param db        - Tenant-scoped Supabase client
 * @param sessionId - Agent session UUID
 * @param data      - Audit data for this interaction
 */
export async function logAgentAudit(
  db: SupabaseClient,
  sessionId: string,
  data: AgentAuditData
): Promise<void> {
  const { error } = await db.from('rag_audit_log').insert({
    session_id: sessionId,
    user_message: data.userMessage,
    tools_used: data.toolsUsed,
    model_used: data.modelUsed,
    tokens_in: data.tokensIn,
    tokens_out: data.tokensOut,
    latency_ms: data.latencyMs,
    guardrail_triggered: data.guardrailTriggered ?? null,
    source: 'unified_agent',
  });

  if (error) {
    console.error('[agent/audit] Failed to log audit entry:', error.message);
  }
}
