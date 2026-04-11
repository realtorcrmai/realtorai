import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const CLASSIFY_TRUST_LEVEL_SCHEMA: Anthropic.Tool = {
  name: 'classify_trust_level',
  description:
    'Get or compute the trust level (L0-L3) for a contact. Trust determines autonomy: L0=always approval, L1=low-stakes auto-send, L2=most auto-send, L3=full auto. Based on successful sends, replies, and deal history.',
  input_schema: {
    type: 'object',
    properties: {
      contact_id: { type: 'string' },
    },
    required: ['contact_id'],
  },
};

export async function classifyTrustLevel(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const contactId = String(input.contact_id);

  // Check existing trust level
  const { data: existing } = await ctx.db
    .from('contact_trust_levels')
    .select('level, positive_signals, negative_signals, last_promoted_at')
    .eq('contact_id', contactId)
    .eq('realtor_id', ctx.realtorId)
    .maybeSingle();

  if (existing) {
    return {
      contact_id: contactId,
      level: existing.level,
      label: ['L0 (new)', 'L1 (proven)', 'L2 (engaged)', 'L3 (deal)'][existing.level] || `L${existing.level}`,
      positive_signals: existing.positive_signals,
      negative_signals: existing.negative_signals,
      last_promoted_at: existing.last_promoted_at,
      auto_send_allowed: existing.level >= 1,
      high_stakes_auto_allowed: existing.level >= 3,
    };
  }

  // No trust record — default L0
  return {
    contact_id: contactId,
    level: 0,
    label: 'L0 (new)',
    positive_signals: 0,
    negative_signals: 0,
    last_promoted_at: null,
    auto_send_allowed: false,
    high_stakes_auto_allowed: false,
    note: 'No trust record found — defaulting to L0 (all emails require approval)',
  };
}
