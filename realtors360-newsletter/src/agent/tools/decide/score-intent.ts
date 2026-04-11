import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const SCORE_INTENT_SCHEMA: Anthropic.Tool = {
  name: 'score_intent',
  description:
    'Classify a contact\'s current intent level based on recent signals. Returns cold/warm/hot with a 0-100 score and reasoning. Use to prioritize who gets emails first.',
  input_schema: {
    type: 'object',
    properties: {
      contact_id: { type: 'string' },
      recent_signals: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of recent engagement signals, e.g. ["opened 3 emails this week", "clicked listing link", "no activity in 14 days"]',
      },
    },
    required: ['contact_id', 'recent_signals'],
  },
};

export async function scoreIntent(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const signals = (input.recent_signals as string[]) || [];

  // Simple deterministic scoring based on signal keywords
  let score = 30; // baseline
  for (const signal of signals) {
    const s = signal.toLowerCase();
    if (s.includes('clicked') || s.includes('replied')) score += 20;
    if (s.includes('opened')) score += 10;
    if (s.includes('booked') || s.includes('showing')) score += 25;
    if (s.includes('no activity') || s.includes('dormant')) score -= 15;
    if (s.includes('unsubscribed') || s.includes('bounced')) score -= 30;
  }
  score = Math.max(0, Math.min(100, score));

  const intent = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';

  return {
    contact_id: String(input.contact_id),
    intent,
    score,
    reasons: signals.length > 0 ? signals : ['No signals provided — using baseline score'],
  };
}
