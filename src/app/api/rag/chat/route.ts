import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthenticatedTenantClient } from '@/lib/supabase/tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { planQuery } from '@/lib/rag/query-planner';
import { retrieveContext } from '@/lib/rag/retriever';
import { synthesize, generateDirect } from '@/lib/rag/synthesizer';
import { getOrCreateSession, addMessage, getRecentHistory, needsSummarization, summarizeHistory, buildUserMessage, buildAssistantMessage } from '@/lib/rag/conversation';
import { checkGuardrails, buildFallbackResponse, hasAdequateContext } from '@/lib/rag/guardrails';
import { logAudit } from '@/lib/rag/feedback';
import type { ChatRequest, ChatResponse } from '@/lib/rag/types';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as ChatRequest;
    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const userEmail = session.user.email;
    const isAdmin = (session.user as { role?: string }).role === 'admin';

    // Create tenant-scoped or admin DB client
    // Admin sees all data; realtor sees only their own
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
    const history = getRecentHistory({ ...chatSession, messages: [...chatSession.messages, userMsg] });
    const plan = await planQuery(
      body.message,
      chatSession.ui_context,
      history.map((m) => ({ role: m.role, content: m.content }))
    );

    let responseText: string;
    let modelTier: 'haiku' | 'sonnet' | 'opus' = 'sonnet';
    let sources: Array<{ source_table: string; source_id: string; snippet: string; similarity: number }> = [];

    // 5. Route based on plan
    if (!plan.needs_retrieval) {
      // Direct generation (greetings, clarifications)
      const result = await generateDirect(body.message, chatSession.ui_context, history);
      responseText = result.text;
      modelTier = result.model_tier;
    } else {
      // 6. Retrieve context (Tier 2: pgvector) — scoped by tenant
      const retrieved = await retrieveContext(
        db,
        plan.search_text,
        plan.filters,
        plan.top_k
      );
      sources = retrieved.sources;

      // 7. Check if context is adequate
      const similarities = retrieved.results.map((r) => r.similarity);
      if (!hasAdequateContext(similarities)) {
        responseText = buildFallbackResponse(plan.intent);
        modelTier = 'sonnet';
      } else {
        // 8. Synthesize response (Tier 3: Sonnet/Opus)
        const result = await synthesize({
          query: body.message,
          plan,
          context: retrieved.formatted,
          conversationHistory: history,
          uiContext: chatSession.ui_context,
          tonePreference: chatSession.tone_preference,
          guardrailDisclaimer: guardrail.disclaimer ?? undefined,
        });
        responseText = result.text;
        modelTier = result.model_tier;
      }
    }

    // 9. Save assistant message
    const assistantMsg = buildAssistantMessage(responseText, sources);
    await addMessage(db, chatSession.id, assistantMsg);

    // 9b. Summarize old messages if session is getting long
    const updatedSession = { ...chatSession, messages: [...chatSession.messages, userMsg, assistantMsg] };
    if (needsSummarization(updatedSession)) {
      summarizeHistory(db, chatSession.id).catch(() => {}); // fire-and-forget
    }

    const latencyMs = Date.now() - startTime;

    // 10. Audit log — scoped by tenant
    await logAudit(db, {
      sessionId: chatSession.id,
      userEmail,
      queryText: body.message,
      intent: plan.intent,
      queryPlan: plan,
      retrievedIds: sources.map((s) => s.source_id),
      retrievedScores: sources.map((s) => s.similarity),
      modelTier,
      responseText: responseText.slice(0, 5000),
      latencyMs,
      guardrailTriggered: guardrail.type ?? undefined,
    });

    const response: ChatResponse = {
      session_id: chatSession.id,
      response: { text: responseText, sources },
      model_tier: modelTier,
      latency_ms: latencyMs,
      guardrail_triggered: guardrail.type ?? undefined,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('RAG chat error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
