// ============================================================
// Query Planner — Tier 1 Haiku: parse user message → QueryPlan
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { createWithRetry } from '@/lib/anthropic/retry';
import { MODELS, MAX_TOKENS, TOP_K_BY_INTENT, CONTENT_TYPES_BY_INTENT } from './constants';
import type { QueryPlan, QueryIntent, UIContext } from './types';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a query router for a BC real estate CRM AI assistant.
Parse the user's message into a structured search plan.

You MUST output ONLY valid JSON — no explanation, no markdown.

Output schema:
{
  "intent": "follow_up" | "newsletter" | "social" | "qa" | "search" | "summarize" | "competitive" | "greeting" | "clarification",
  "search_text": "<semantic search query to find relevant context>",
  "filters": {
    "contact_id": "<UUID or null>",
    "listing_id": "<UUID or null>",
    "content_type": ["<type1>", "<type2>"] or null,
    "date_after": "<ISO date or null>"
  },
  "top_k": <number 1-20>,
  "needs_retrieval": <boolean>,
  "escalate_to_opus": <boolean>
}

Rules:
- "greeting" / "clarification" → needs_retrieval: false
- "summarize" with 6+ months → escalate_to_opus: true
- "follow_up" → filter by contact_id if available
- "qa" → filter content_type to knowledge base only
- "competitive" → filter content_type to competitor only
- Use the UI context to set filters (contact_id, listing_id)
- search_text should be a semantic query capturing the user's intent`;

/**
 * Parse a user message + UI context into a structured QueryPlan.
 * Uses Claude Haiku for fast, cheap intent classification.
 */
export async function planQuery(
  message: string,
  uiContext: UIContext = {},
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<QueryPlan> {
  const contextInfo = buildContextInfo(uiContext);
  const historyInfo = conversationHistory.length > 0
    ? `\nRecent conversation:\n${conversationHistory.slice(-3).map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}`
    : '';

  const userPrompt = `UI Context: ${contextInfo}${historyInfo}

User message: "${message}"`;

  try {
    const response = await createWithRetry(anthropic, {
      model: MODELS.TIER1_PLANNER,
      max_tokens: MAX_TOKENS.TIER1_PLANNER,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const plan = parseQueryPlanJson(text, uiContext);
    return plan;
  } catch (err) {
    // Fallback: assume search intent
    return fallbackPlan(message, uiContext);
  }
}

/**
 * Parse JSON from Haiku response, with fallback handling.
 */
function parseQueryPlanJson(text: string, uiContext: UIContext): QueryPlan {
  // Extract JSON from possible markdown code fences
  let jsonStr = text;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1];

  const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!braceMatch) throw new Error('No JSON found in response');

  const parsed = JSON.parse(braceMatch[0]);

  const intent: QueryIntent = validateIntent(parsed.intent);

  return {
    intent,
    search_text: parsed.search_text || '',
    filters: {
      contact_id: parsed.filters?.contact_id || uiContext.contact_id,
      listing_id: parsed.filters?.listing_id || uiContext.listing_id,
      content_type: parsed.filters?.content_type || CONTENT_TYPES_BY_INTENT[intent] || undefined,
      date_after: parsed.filters?.date_after,
    },
    top_k: parsed.top_k || TOP_K_BY_INTENT[intent] || 5,
    needs_retrieval: parsed.needs_retrieval ?? true,
    escalate_to_opus: parsed.escalate_to_opus ?? false,
  };
}

/**
 * Fallback plan when Haiku fails.
 */
function fallbackPlan(message: string, uiContext: UIContext): QueryPlan {
  return {
    intent: 'search',
    search_text: message,
    filters: {
      contact_id: uiContext.contact_id,
      listing_id: uiContext.listing_id,
    },
    top_k: 5,
    needs_retrieval: true,
    escalate_to_opus: false,
  };
}

function validateIntent(raw: string): QueryIntent {
  const valid: QueryIntent[] = [
    'follow_up', 'newsletter', 'social', 'qa', 'search',
    'summarize', 'competitive', 'greeting', 'clarification',
  ];
  return valid.includes(raw as QueryIntent)
    ? (raw as QueryIntent)
    : 'search';
}

function buildContextInfo(ctx: UIContext): string {
  const parts: string[] = [];
  if (ctx.page) parts.push(`Page: ${ctx.page}`);
  if (ctx.contact_name) parts.push(`Contact: ${ctx.contact_name} (${ctx.contact_type ?? 'unknown'}, ${ctx.contact_stage ?? 'unknown'})`);
  if (ctx.contact_id) parts.push(`Contact ID: ${ctx.contact_id}`);
  if (ctx.listing_address) parts.push(`Listing: ${ctx.listing_address}`);
  if (ctx.listing_id) parts.push(`Listing ID: ${ctx.listing_id}`);
  if (ctx.campaign_type) parts.push(`Campaign: ${ctx.campaign_type}`);
  if (ctx.segment) parts.push(`Segment: ${ctx.segment}`);
  if (ctx.draft_content) parts.push(`Draft: ${ctx.draft_content.slice(0, 200)}`);
  return parts.length > 0 ? parts.join(' | ') : 'No context loaded';
}

/**
 * Pure function: build context info string (exported for testing).
 */
export { buildContextInfo, validateIntent, fallbackPlan };
