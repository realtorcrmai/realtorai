// ============================================================
// Synthesizer — Tier 3: Sonnet/Opus grounded generation
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { MODELS, MAX_TOKENS, SESSION } from './constants';
import type { QueryPlan, RagMessage, UIContext, SearchResult } from './types';

const anthropic = new Anthropic();

interface SynthesizeInput {
  query: string;
  plan: QueryPlan;
  context: string;          // formatted retrieval chunks
  conversationHistory: RagMessage[];
  uiContext: UIContext;
  tonePreference: string;
  voiceRules?: string[];     // from voice_rules table
  guardrailDisclaimer?: string;
}

interface SynthesizeOutput {
  text: string;
  model_tier: 'haiku' | 'sonnet' | 'opus';
}

/**
 * Generate a grounded response using retrieved context.
 * Routes to Sonnet (standard) or Opus (complex) based on QueryPlan.
 * BLOCKS generation entirely if guardrail is triggered (tax/legal/financial).
 */
export async function synthesize(input: SynthesizeInput): Promise<SynthesizeOutput> {
  // If guardrail triggered, return disclaimer directly — do NOT call Claude
  if (input.guardrailDisclaimer) {
    return { text: input.guardrailDisclaimer, model_tier: 'haiku' };
  }

  const model = input.plan.escalate_to_opus
    ? MODELS.TIER3_COMPLEX
    : MODELS.TIER3_STANDARD;

  const maxTokens = input.plan.escalate_to_opus
    ? MAX_TOKENS.TIER3_COMPLEX
    : MAX_TOKENS.TIER3_STANDARD;

  const modelTier = input.plan.escalate_to_opus ? 'opus' : 'sonnet';

  const systemPrompt = buildSystemPrompt(input);
  const messages = buildMessages(input);

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text' as const,
        text: systemPrompt,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages,
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  return { text, model_tier: modelTier };
}

/**
 * Build the system prompt with context, tone, voice rules, and guardrails.
 */
function buildSystemPrompt(input: SynthesizeInput): string {
  const parts: string[] = [
    'You are a real estate AI assistant for a BC, Canada REALTOR CRM.',
    '',
  ];

  // Tone
  parts.push(`TONE: ${input.tonePreference || 'professional'}`);

  // Voice rules
  if (input.voiceRules?.length) {
    parts.push('');
    parts.push('VOICE RULES (match the realtor\'s writing style):');
    input.voiceRules.forEach((rule) => parts.push(`- ${rule}`));
  }

  // UI context
  const ctxParts: string[] = [];
  if (input.uiContext.contact_name) {
    ctxParts.push(`Contact: ${input.uiContext.contact_name} (${input.uiContext.contact_type ?? ''}, ${input.uiContext.contact_stage ?? ''})`);
  }
  if (input.uiContext.listing_address) {
    ctxParts.push(`Listing: ${input.uiContext.listing_address}`);
  }
  if (input.uiContext.segment) {
    ctxParts.push(`Audience: ${input.uiContext.segment}`);
  }
  if (ctxParts.length > 0) {
    parts.push('');
    parts.push('CRM CONTEXT:');
    ctxParts.forEach((c) => parts.push(`- ${c}`));
  }

  // Retrieved context
  if (input.context) {
    parts.push('');
    parts.push('RETRIEVED CONTEXT (use these facts — cite [N] when referencing):');
    parts.push('---');
    parts.push(input.context);
    parts.push('---');
  }

  // Rules
  parts.push('');
  parts.push('RULES:');
  parts.push('1. ONLY state facts that appear in the RETRIEVED CONTEXT above. If unsure, say so.');
  parts.push('2. Clearly distinguish facts from data vs your suggestions.');
  parts.push('3. Never invent viewings, addresses, conversations, or dates not in context.');
  parts.push('4. For legal, tax, or financial advice — add disclaimer and recommend a professional.');
  parts.push('5. If no relevant context found — say you have limited data and suggest what to add to CRM.');
  parts.push('6. End with a brief note of which source numbers [N] you referenced.');

  return parts.join('\n');
}

/**
 * Build the messages array with conversation history.
 */
function buildMessages(
  input: SynthesizeInput
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Include last N turns from conversation history
  const history = input.conversationHistory.slice(-SESSION.MAX_HISTORY_TURNS);
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Current user message
  messages.push({ role: 'user', content: input.query });

  return messages;
}

/**
 * Generate a simple response without retrieval (for greetings, clarifications).
 */
export async function generateDirect(
  message: string,
  uiContext: UIContext = {},
  conversationHistory: RagMessage[] = []
): Promise<SynthesizeOutput> {
  const systemPrompt = [
    'You are a friendly real estate AI assistant for a BC, Canada REALTOR CRM.',
    'You help realtors with their day-to-day tasks.',
    'Keep responses concise and helpful.',
    'If the user asks a question that needs CRM data, let them know you can search for that information.',
  ].join('\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  const history = conversationHistory.slice(-SESSION.MAX_HISTORY_TURNS);
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: message });

  const response = await anthropic.messages.create({
    model: MODELS.TIER3_STANDARD,
    max_tokens: 500,
    system: systemPrompt,
    messages,
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  return { text, model_tier: 'sonnet' };
}

/**
 * Validate response against retrieved context (lightweight hallucination check).
 * Checks that any numbers (prices, counts, dates) in the response appear in the context.
 * Returns { valid, warnings } — warnings are logged but don't block the response.
 */
export function validateResponseGrounding(
  responseText: string,
  contextText: string
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!contextText || !responseText) return { valid: true, warnings };

  // Extract dollar amounts from response
  const responsePrices = responseText.match(/\$[\d,]+/g) ?? [];
  for (const price of responsePrices) {
    const normalized = price.replace(/[$,]/g, '');
    if (!contextText.includes(normalized) && !contextText.includes(price)) {
      warnings.push(`Price ${price} in response not found in retrieved context`);
    }
  }

  // Extract dates (YYYY-MM-DD) from response
  const responseDates = responseText.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  for (const date of responseDates) {
    if (!contextText.includes(date)) {
      warnings.push(`Date ${date} in response not found in retrieved context`);
    }
  }

  // Extract specific numbers (e.g., "3 bedrooms", "5 showings")
  const responseNumbers = responseText.match(/\b(\d+)\s+(bedroom|bathroom|showing|listing|contact|offer)/gi) ?? [];
  for (const numPhrase of responseNumbers) {
    const num = numPhrase.match(/\d+/)?.[0];
    if (num && !contextText.includes(num)) {
      warnings.push(`Quantity "${numPhrase}" in response not found in retrieved context`);
    }
  }

  // Valid if 0 warnings or fewer than 3 (minor hallucinations are common)
  return { valid: warnings.length < 3, warnings };
}

// Export pure functions for testing
export { buildSystemPrompt, buildMessages };
