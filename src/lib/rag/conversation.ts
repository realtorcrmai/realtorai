// ============================================================
// Conversation Manager — session CRUD + multi-turn chat
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { SESSION, MODELS, MAX_TOKENS } from './constants';
import type { RagSession, RagMessage, UIContext, SourceReference } from './types';

/**
 * Create a new chat session.
 */
export async function createSession(
  db: SupabaseClient,
  userEmail: string,
  uiContext: UIContext = {},
  tonePreference: string = 'professional'
): Promise<RagSession> {
  const { data, error } = await db
    .from('rag_sessions')
    .insert({
      user_email: userEmail,
      ui_context: uiContext,
      tone_preference: tonePreference,
      messages: [],
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data as RagSession;
}

/**
 * Get an active session by ID. Returns null if not found or inactive.
 */
export async function getSession(db: SupabaseClient, sessionId: string): Promise<RagSession | null> {
  const { data, error } = await db
    .from('rag_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) return null;

  // Check idle timeout
  const session = data as RagSession;
  if (session.is_active) {
    const lastUpdate = new Date(session.updated_at).getTime();
    const now = Date.now();
    if (now - lastUpdate > SESSION.IDLE_TIMEOUT_MS) {
      await closeSession(db, sessionId);
      return null;
    }
  }

  return session.is_active ? session : null;
}

/**
 * Get or create a session. If session_id provided and active, resume it.
 * Otherwise create a new one.
 */
export async function getOrCreateSession(
  db: SupabaseClient,
  sessionId: string | undefined,
  userEmail: string,
  uiContext: UIContext = {},
  tonePreference: string = 'professional'
): Promise<RagSession> {
  if (sessionId) {
    const existing = await getSession(db, sessionId);
    if (existing) {
      // Security: verify session belongs to requesting user (prevent session hijacking)
      if (existing.user_email !== userEmail) {
        // Session belongs to different user — create new session instead
        return createSession(db, userEmail, uiContext, tonePreference);
      }
      // Update UI context if it changed
      if (Object.keys(uiContext).length > 0) {
        await updateUIContext(db, sessionId, uiContext);
        existing.ui_context = uiContext;
      }
      return existing;
    }
  }
  return createSession(db, userEmail, uiContext, tonePreference);
}

/**
 * Append a message to the session.
 */
export async function addMessage(
  db: SupabaseClient,
  sessionId: string,
  message: RagMessage
): Promise<void> {
  // Get current messages
  const { data: session } = await db
    .from('rag_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const messages = [...(session.messages as RagMessage[]), message];

  await db
    .from('rag_sessions')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Update UI context (e.g., user navigated to different page).
 */
export async function updateUIContext(
  db: SupabaseClient,
  sessionId: string,
  uiContext: UIContext
): Promise<void> {
  await db
    .from('rag_sessions')
    .update({ ui_context: uiContext, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Close a session (mark inactive).
 */
export async function closeSession(db: SupabaseClient, sessionId: string): Promise<void> {
  await db
    .from('rag_sessions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Get conversation history for the session (for Tier 3 prompt).
 * Returns last MAX_HISTORY_TURNS messages.
 */
export function getRecentHistory(session: RagSession): RagMessage[] {
  return session.messages.slice(-SESSION.MAX_HISTORY_TURNS);
}

/**
 * Check if session needs summarization (too many messages).
 */
export function needsSummarization(session: RagSession): boolean {
  return session.messages.length > SESSION.SUMMARIZE_THRESHOLD;
}

/**
 * Summarize old messages when session exceeds SUMMARIZE_THRESHOLD.
 * Compresses all messages except the last MAX_HISTORY_TURNS into a single summary.
 * Replaces the session's messages array with [summary, ...recent].
 */
export async function summarizeHistory(db: SupabaseClient, sessionId: string): Promise<void> {
  const { data: session } = await db
    .from('rag_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single();

  if (!session) return;

  const messages = session.messages as RagMessage[];
  if (messages.length <= SESSION.SUMMARIZE_THRESHOLD) return;

  // Split: older messages to summarize, recent to keep verbatim
  const cutoff = messages.length - SESSION.MAX_HISTORY_TURNS;
  const toSummarize = messages.slice(0, cutoff);
  const toKeep = messages.slice(cutoff);

  // Build conversation text for summarization
  const conversationText = toSummarize
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n\n');

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: MODELS.TIER1_PLANNER,
      max_tokens: MAX_TOKENS.TIER1_PLANNER,
      messages: [{
        role: 'user',
        content: `Summarize this conversation history in 2-3 sentences, preserving key facts, decisions, and any contact/listing names mentioned:\n\n${conversationText}`,
      }],
    });

    const summaryText = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Previous conversation summarized.';

    const summaryMessage: RagMessage = {
      role: 'assistant',
      content: `[Summary of earlier conversation]\n${summaryText}`,
      timestamp: new Date().toISOString(),
    };

    const condensed = [summaryMessage, ...toKeep];

    await db
      .from('rag_sessions')
      .update({ messages: condensed, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch (err) {
    console.warn('[rag-conversation] Summarization failed:', (err as Error)?.message);
    // Don't fail — just leave messages as-is
  }
}

/**
 * Build a user RagMessage.
 */
export function buildUserMessage(content: string): RagMessage {
  return {
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build an assistant RagMessage with sources.
 */
export function buildAssistantMessage(
  content: string,
  sources: SourceReference[] = []
): RagMessage {
  return {
    role: 'assistant',
    content,
    sources,
    timestamp: new Date().toISOString(),
  };
}
