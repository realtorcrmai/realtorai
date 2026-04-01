import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { planQuery } from '@/lib/rag/query-planner';
import { retrieveContext } from '@/lib/rag/retriever';
import { buildSystemPrompt, buildMessages } from '@/lib/rag/synthesizer';
import {
  getOrCreateSession,
  addMessage,
  getRecentHistory,
  needsSummarization,
  summarizeHistory,
  buildUserMessage,
  buildAssistantMessage,
} from '@/lib/rag/conversation';
import { checkGuardrails, buildFallbackResponse, hasAdequateContext } from '@/lib/rag/guardrails';
import { logAudit } from '@/lib/rag/feedback';
import { MODELS, MAX_TOKENS, SESSION } from '@/lib/rag/constants';
import type { ChatRequest, RagMessage, SourceReference } from '@/lib/rag/types';

const anthropic = new Anthropic();

/**
 * SSE streaming endpoint for RAG chat.
 * Same pipeline as /api/rag/chat but streams the Anthropic response token-by-token.
 *
 * SSE event types:
 *   { type: 'meta',      session_id: string }
 *   { type: 'text',      content: string }
 *   { type: 'sources',   sources: SourceReference[] }
 *   { type: 'guardrail', text: string }
 *   { type: 'done' }
 *   { type: 'error',     message: string }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const encoder = new TextEncoder();

  // Helper to send an SSE event
  function sseEvent(obj: Record<string, unknown>): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);
  }

  try {
    // --- Auth ---
    const session = await auth();
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as ChatRequest;
    if (!body.message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userEmail = session.user.email;
    const isAdmin = (session.user as { role?: string }).role === 'admin';

    // Create tenant-scoped or admin DB client
    const db = isAdmin
      ? createAdminClient()
      : (await getAuthenticatedTenantClient()).raw;

    // 1. Get or create chat session
    const chatSession = await getOrCreateSession(
      db,
      body.session_id,
      userEmail,
      body.ui_context,
      'professional'
    );

    // 2. Add user message
    const userMsg = buildUserMessage(body.message);
    await addMessage(db, chatSession.id, userMsg);

    // 3. Check guardrails
    const guardrail = checkGuardrails(body.message);

    // 4. Plan query (Tier 1: Haiku)
    const history = getRecentHistory({
      ...chatSession,
      messages: [...chatSession.messages, userMsg],
    });
    const plan = await planQuery(
      body.message,
      chatSession.ui_context,
      history.map((m) => ({ role: m.role, content: m.content }))
    );

    // Retrieve context (needed for retrieval-based queries)
    let sources: SourceReference[] = [];
    let formattedContext = '';
    let similarities: number[] = [];

    if (plan.needs_retrieval) {
      const retrieved = await retrieveContext(
        db,
        plan.search_text,
        plan.filters,
        plan.top_k
      );
      sources = retrieved.sources;
      formattedContext = retrieved.formatted;
      similarities = retrieved.results.map((r) => r.similarity);
    }

    // --- Build the SSE ReadableStream ---
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata event
          controller.enqueue(sseEvent({ type: 'meta', session_id: chatSession.id }));

          let fullText = '';
          let modelTier: 'haiku' | 'sonnet' | 'opus' = 'sonnet';

          // --- Guardrail blocked ---
          if (guardrail.blocked && guardrail.disclaimer) {
            controller.enqueue(sseEvent({ type: 'guardrail', text: guardrail.disclaimer }));
            fullText = guardrail.disclaimer;
            modelTier = 'haiku';

          // --- No retrieval needed (direct generation) ---
          } else if (!plan.needs_retrieval) {
            const directSystemPrompt = [
              'You are a friendly real estate AI assistant for a BC, Canada REALTOR CRM.',
              'You help realtors with their day-to-day tasks.',
              'Keep responses concise and helpful.',
              'If the user asks a question that needs CRM data, let them know you can search for that information.',
            ].join('\n');

            const directMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
            const historySlice = history.slice(-SESSION.MAX_HISTORY_TURNS);
            for (const msg of historySlice) {
              directMessages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content,
              });
            }
            directMessages.push({ role: 'user', content: body.message });

            const anthropicStream = anthropic.messages.stream({
              model: MODELS.TIER3_STANDARD,
              max_tokens: 500,
              system: directSystemPrompt,
              messages: directMessages,
            });

            for await (const event of anthropicStream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                const chunk = event.delta.text;
                fullText += chunk;
                controller.enqueue(sseEvent({ type: 'text', content: chunk }));
              }
            }

          // --- Retrieval path: inadequate context ---
          } else if (!hasAdequateContext(similarities)) {
            const fallback = buildFallbackResponse(plan.intent);
            fullText = fallback;
            // Send fallback as a single text event
            controller.enqueue(sseEvent({ type: 'text', content: fallback }));

          // --- Retrieval path: stream synthesized response ---
          } else {
            const synthInput = {
              query: body.message,
              plan,
              context: formattedContext,
              conversationHistory: history,
              uiContext: chatSession.ui_context,
              tonePreference: chatSession.tone_preference,
              guardrailDisclaimer: guardrail.disclaimer ?? undefined,
            };

            // If guardrail triggered inside synthesize input, it would have been
            // caught above. Build system prompt and messages for streaming.
            const systemPrompt = buildSystemPrompt(synthInput);
            const messages = buildMessages(synthInput);

            const model = plan.escalate_to_opus
              ? MODELS.TIER3_COMPLEX
              : MODELS.TIER3_STANDARD;
            const maxTokens = plan.escalate_to_opus
              ? MAX_TOKENS.TIER3_COMPLEX
              : MAX_TOKENS.TIER3_STANDARD;
            modelTier = plan.escalate_to_opus ? 'opus' : 'sonnet';

            const anthropicStream = anthropic.messages.stream({
              model,
              max_tokens: maxTokens,
              system: systemPrompt,
              messages,
            });

            for await (const event of anthropicStream) {
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                const chunk = event.delta.text;
                fullText += chunk;
                controller.enqueue(sseEvent({ type: 'text', content: chunk }));
              }
            }
          }

          // Send sources if any
          if (sources.length > 0) {
            controller.enqueue(sseEvent({ type: 'sources', sources }));
          }

          // Send done
          controller.enqueue(sseEvent({ type: 'done' }));
          controller.close();

          // --- Post-stream: persist and audit (non-blocking) ---
          (async () => {
            try {
              const assistantMsg = buildAssistantMessage(fullText, sources);
              await addMessage(db, chatSession.id, assistantMsg);

              // Summarize if session is long
              const updatedSession = {
                ...chatSession,
                messages: [...chatSession.messages, userMsg, assistantMsg],
              };
              if (needsSummarization(updatedSession)) {
                summarizeHistory(db, chatSession.id).catch(() => {});
              }

              const latencyMs = Date.now() - startTime;
              await logAudit(db, {
                sessionId: chatSession.id,
                userEmail,
                queryText: body.message,
                intent: plan.intent,
                queryPlan: plan,
                retrievedIds: sources.map((s) => s.source_id),
                retrievedScores: sources.map((s) => s.similarity),
                modelTier,
                responseText: fullText.slice(0, 5000),
                latencyMs,
                guardrailTriggered: guardrail.type ?? undefined,
              });
            } catch (postErr) {
              console.error('RAG chat-stream post-stream error:', postErr);
            }
          })();
        } catch (streamErr) {
          console.error('RAG chat-stream error during streaming:', streamErr);
          const errMsg =
            streamErr instanceof Error ? streamErr.message : 'Stream failed';
          controller.enqueue(sseEvent({ type: 'error', message: errMsg }));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('RAG chat-stream error:', err);
    const errMsg = err instanceof Error ? err.message : 'Internal server error';

    // If we failed before creating the stream, return a normal SSE response
    // with just an error event so the client still gets a parseable response.
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: errMsg })}\n\n`
          )
        );
        controller.close();
      },
    });

    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }
}
