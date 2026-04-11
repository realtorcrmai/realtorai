import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const GET_CONTACT_SCHEMA: Anthropic.Tool = {
  name: 'get_contact',
  description:
    'Get full details for a single contact including engagement intelligence, newsletter preferences, CASL consent status, and tags. Use before deciding what to send.',
  input_schema: {
    type: 'object',
    properties: {
      contact_id: { type: 'string', description: 'UUID of the contact' },
    },
    required: ['contact_id'],
  },
};

export async function getContact(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const contactId = String(input.contact_id);

  // Use prefetched data if available (batch-loaded by triage loop)
  if (ctx.prefetchedContacts?.has(contactId)) {
    return ctx.prefetchedContacts.get(contactId)!;
  }

  const { data, error } = await ctx.db
    .from('contacts')
    .select('id, name, email, phone, type, lead_status, stage_bar, pref_channel, tags, newsletter_intelligence, newsletter_unsubscribed, casl_consent_given, ai_lead_score, notes, updated_at')
    .eq('id', contactId)
    .eq('realtor_id', ctx.realtorId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: 'Contact not found' };
  return data;
}
