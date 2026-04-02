import { NextRequest, NextResponse } from "next/server";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { planQuery } from "@/lib/rag/query-planner";
import { retrieveContext } from "@/lib/rag/retriever";
import { synthesize, generateDirect } from "@/lib/rag/synthesizer";
import { checkGuardrails, buildFallbackResponse, hasAdequateContext } from "@/lib/rag/guardrails";
import type { ChatRequest, UIContext } from "@/lib/rag/types";

/**
 * POST /api/voice-agent/rag
 * RAG chat endpoint for the voice agent. Uses Bearer token auth.
 * Accepts: { action: "chat" | "search", message/query, ui_context?, filters?, top_k? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();
  const action = body.action || "chat";

  try {
    if (action === "search") {
      return handleSearch(body, auth.tenantId);
    }
    return handleChat(body, auth.tenantId);
  } catch (err) {
    console.error("[voice-agent/rag] Error:", err);
    return NextResponse.json(
      { error: "RAG processing failed", detail: String(err) },
      { status: 500 }
    );
  }
}

async function handleChat(
  body: { message?: string; question?: string; ui_context?: UIContext },
  tenantId: string
) {
  const message = body.message || body.question || "";
  if (!message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const db = createAdminClient();
  const uiContext = body.ui_context || {};

  // Guardrails
  const guardrail = checkGuardrails(message);
  if (guardrail) {
    return NextResponse.json({
      response: { text: buildFallbackResponse(guardrail), sources: [] },
      model_tier: "guardrail",
      guardrail_triggered: guardrail,
    });
  }

  // Tier 1: Plan the query
  const plan = await planQuery(message, uiContext);

  if (!plan.needs_retrieval) {
    // Simple greeting/clarification — no retrieval needed
    const direct = await generateDirect(message, plan);
    return NextResponse.json({
      response: { text: direct, sources: [] },
      model_tier: "haiku",
    });
  }

  // Tier 2: Retrieve context
  const context = await retrieveContext(db, plan, tenantId);

  if (!hasAdequateContext(context)) {
    const direct = await generateDirect(message, plan);
    return NextResponse.json({
      response: { text: direct, sources: [] },
      model_tier: "haiku",
      note: "No matching context found — answered from general knowledge",
    });
  }

  // Tier 3: Synthesize grounded response
  const model = plan.escalate_to_opus ? "opus" : "sonnet";
  const result = await synthesize(message, context, plan, model);

  const sources = context.slice(0, 5).map((c) => ({
    source_table: c.source_table,
    source_id: c.source_id,
    snippet: (c.content_text || "").slice(0, 200),
    similarity: c.similarity,
  }));

  return NextResponse.json({
    response: { text: result, sources },
    model_tier: model,
  });
}

async function handleSearch(
  body: { query?: string; filters?: Record<string, unknown>; top_k?: number },
  tenantId: string
) {
  const query = body.query || "";
  if (!query.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const db = createAdminClient();
  const topK = Math.min(body.top_k || 5, 15);

  const plan = await planQuery(query, {});
  const context = await retrieveContext(db, plan, tenantId);

  const results = context.slice(0, topK).map((c) => ({
    source_table: c.source_table,
    source_id: c.source_id,
    content_text: (c.content_text || "").slice(0, 300),
    similarity: c.similarity,
    content_type: c.content_type,
  }));

  return NextResponse.json({
    results,
    count: results.length,
  });
}
