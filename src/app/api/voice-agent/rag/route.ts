import { NextRequest, NextResponse } from "next/server";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UIContext, SearchFilters } from "@/lib/rag/types";

// Lazy-load RAG modules — gracefully degrade if not configured
let ragLoaded = false;
let ragAvailable = false;
let rag: {
  planQuery: typeof import("@/lib/rag/query-planner").planQuery;
  retrieveContext: typeof import("@/lib/rag/retriever").retrieveContext;
  synthesize: typeof import("@/lib/rag/synthesizer").synthesize;
  generateDirect: typeof import("@/lib/rag/synthesizer").generateDirect;
  checkGuardrails: typeof import("@/lib/rag/guardrails").checkGuardrails;
  hasAdequateContext: typeof import("@/lib/rag/guardrails").hasAdequateContext;
};

async function ensureRag(): Promise<boolean> {
  if (ragLoaded) return ragAvailable;
  ragLoaded = true;
  try {
    const [qp, ret, syn, guard] = await Promise.all([
      import("@/lib/rag/query-planner"),
      import("@/lib/rag/retriever"),
      import("@/lib/rag/synthesizer"),
      import("@/lib/rag/guardrails"),
    ]);
    rag = {
      planQuery: qp.planQuery,
      retrieveContext: ret.retrieveContext,
      synthesize: syn.synthesize,
      generateDirect: syn.generateDirect,
      checkGuardrails: guard.checkGuardrails,
      hasAdequateContext: guard.hasAdequateContext,
    };
    ragAvailable = true;
    return true;
  } catch (err) {
    console.warn("[voice-agent/rag] RAG modules not available:", err);
    return false;
  }
}

function unavailableResponse() {
  return NextResponse.json({
    response: {
      text: "The knowledge base is not configured yet. Try using search_properties, find_contact, or get_crm_help instead.",
      sources: [],
    },
    model_tier: "unavailable",
  });
}

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

  if (!(await ensureRag())) {
    return unavailableResponse();
  }

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
  const uiContext: UIContext = body.ui_context || {};

  // Guardrails
  const guardrailResult = rag.checkGuardrails(message);
  if (guardrailResult.blocked) {
    return NextResponse.json({
      response: { text: guardrailResult.disclaimer, sources: [] },
      model_tier: "guardrail",
      guardrail_triggered: guardrailResult.type,
    });
  }

  // Tier 1: Plan the query
  const plan = await rag.planQuery(message, uiContext);

  if (!plan.needs_retrieval) {
    const direct = await rag.generateDirect(message, uiContext);
    return NextResponse.json({
      response: { text: direct.text, sources: [] },
      model_tier: direct.model_tier,
    });
  }

  // Tier 2: Retrieve context
  const filters: SearchFilters = {};
  if (uiContext.contact_id) filters.contact_id = uiContext.contact_id;
  if (uiContext.listing_id) filters.listing_id = uiContext.listing_id;

  const retrieval = await rag.retrieveContext(db, message, filters);
  const similarities = retrieval.results.map((r) => r.similarity);

  if (!rag.hasAdequateContext(similarities)) {
    const direct = await rag.generateDirect(message, uiContext);
    return NextResponse.json({
      response: { text: direct.text, sources: [] },
      model_tier: direct.model_tier,
      note: "No matching context found — answered from general knowledge",
    });
  }

  // Tier 3: Synthesize grounded response
  const result = await rag.synthesize({
    query: message,
    plan,
    context: retrieval.formatted,
    conversationHistory: [],
    uiContext,
    tonePreference: "professional",
  });

  return NextResponse.json({
    response: { text: result.text, sources: retrieval.sources },
    model_tier: result.model_tier,
  });
}

async function handleSearch(
  body: { query?: string; filters?: SearchFilters; top_k?: number },
  tenantId: string
) {
  const query = body.query || "";
  if (!query.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const db = createAdminClient();
  const topK = Math.min(body.top_k || 5, 15);

  const retrieval = await rag.retrieveContext(db, query, body.filters || {}, topK);

  const results = retrieval.results.slice(0, topK).map((c) => ({
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
