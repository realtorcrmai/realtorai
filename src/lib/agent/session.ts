// ============================================================
// Unified Agent — Session Persistence
// ============================================================
// Save and load chat sessions to/from unified_agent_sessions table.
// Sessions are tenant-scoped via realtor_id.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AgentSession {
  id: string;
  realtor_id: string;
  session_type: 'text' | 'voice' | 'unified';
  current_mode: 'text' | 'voice';
  ui_context: Record<string, unknown>;
  tone_preference: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  summary: string | null;
  tools_used: string[];
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  created_at: string;
  last_activity_at: string;
}

/**
 * Get or create a session. If sessionId provided and belongs to user, return it.
 * Otherwise create a new one.
 */
export async function getOrCreateAgentSession(
  db: SupabaseClient,
  sessionId: string | undefined,
  uiContext: Record<string, unknown> = {},
  mode: 'text' | 'voice' = 'text'
): Promise<AgentSession> {
  if (sessionId) {
    const { data: existing } = await db
      .from('unified_agent_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (existing) {
      // Update context and activity timestamp
      await db
        .from('unified_agent_sessions')
        .update({
          ui_context: uiContext,
          current_mode: mode,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      return existing as AgentSession;
    }
  }

  // Create new session
  const { data, error } = await db
    .from('unified_agent_sessions')
    .insert({
      session_type: mode === 'voice' ? 'voice' : 'text',
      current_mode: mode,
      ui_context: uiContext,
      messages: [],
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data as AgentSession;
}

/**
 * Append a message to the session's messages array.
 */
export async function appendSessionMessage(
  db: SupabaseClient,
  sessionId: string,
  message: { role: string; content: string }
): Promise<void> {
  const { data: session } = await db
    .from('unified_agent_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  const messages = [...(session.messages as Array<Record<string, unknown>> || []), {
    ...message,
    timestamp: new Date().toISOString(),
  }];

  await db
    .from('unified_agent_sessions')
    .update({ messages, last_activity_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Update session cost tracking.
 */
export async function updateSessionCost(
  db: SupabaseClient,
  sessionId: string,
  tokensIn: number,
  tokensOut: number,
  costUsd: number,
  toolsUsed: string[]
): Promise<void> {
  const { data: session } = await db
    .from('unified_agent_sessions')
    .select('total_tokens_in, total_tokens_out, total_cost_usd, tools_used')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  await db
    .from('unified_agent_sessions')
    .update({
      total_tokens_in: (session.total_tokens_in || 0) + tokensIn,
      total_tokens_out: (session.total_tokens_out || 0) + tokensOut,
      total_cost_usd: parseFloat(((session.total_cost_usd || 0) + costUsd).toFixed(4)),
      tools_used: [...new Set([...(session.tools_used || []), ...toolsUsed])],
    })
    .eq('id', sessionId);
}

/**
 * Get recent sessions for the current user.
 */
export async function getRecentSessions(
  db: SupabaseClient,
  limit: number = 5
): Promise<AgentSession[]> {
  const { data } = await db
    .from('unified_agent_sessions')
    .select('*')
    .order('last_activity_at', { ascending: false })
    .limit(limit);

  return (data || []) as AgentSession[];
}
