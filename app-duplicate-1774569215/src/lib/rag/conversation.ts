// ============================================================
// Conversation Manager — session CRUD + multi-turn chat
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { SESSION } from './constants';
import type { RagSession, RagMessage, UIContext, SourceReference } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Create a new chat session.
 */
export async function createSession(
  userEmail: string,
  uiContext: UIContext = {},
  tonePreference: string = 'professional'
): Promise<RagSession> {
  const admin = getAdmin();
  const { data, error } = await admin
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
export async function getSession(sessionId: string): Promise<RagSession | null> {
  const admin = getAdmin();
  const { data, error } = await admin
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
      await closeSession(sessionId);
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
  sessionId: string | undefined,
  userEmail: string,
  uiContext: UIContext = {},
  tonePreference: string = 'professional'
): Promise<RagSession> {
  if (sessionId) {
    const existing = await getSession(sessionId);
    if (existing) {
      // Update UI context if it changed
      if (Object.keys(uiContext).length > 0) {
        await updateUIContext(sessionId, uiContext);
        existing.ui_context = uiContext;
      }
      return existing;
    }
  }
  return createSession(userEmail, uiContext, tonePreference);
}

/**
 * Append a message to the session.
 */
export async function addMessage(
  sessionId: string,
  message: RagMessage
): Promise<void> {
  const admin = getAdmin();

  // Get current messages
  const { data: session } = await admin
    .from('rag_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single();

  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const messages = [...(session.messages as RagMessage[]), message];

  await admin
    .from('rag_sessions')
    .update({ messages, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Update UI context (e.g., user navigated to different page).
 */
export async function updateUIContext(
  sessionId: string,
  uiContext: UIContext
): Promise<void> {
  const admin = getAdmin();
  await admin
    .from('rag_sessions')
    .update({ ui_context: uiContext, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

/**
 * Close a session (mark inactive).
 */
export async function closeSession(sessionId: string): Promise<void> {
  const admin = getAdmin();
  await admin
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
