import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const LIST_CONTACTS_SCHEMA: Anthropic.Tool = {
  name: 'list_contacts',
  description:
    'List contacts for this realtor, optionally filtered by type (buyer/seller/other) or lead status. Returns id, name, email, type, lead_status, and last activity date. Use to find contacts who might need an email.',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Filter by contact type: buyer, seller, other, or omit for all' },
      lead_status: { type: 'string', description: 'Filter by lead status: lead, active, under_contract, past_client, dormant' },
      limit: { type: 'number', description: 'Max contacts to return (default 20, max 50)' },
    },
  },
};

export async function listContacts(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const limit = Math.min(Number(input.limit) || 20, 50);

  let query = ctx.db
    .from('contacts')
    .select('id, name, email, type, lead_status, stage_bar, updated_at')
    .eq('realtor_id', ctx.realtorId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (input.type && typeof input.type === 'string') {
    query = query.eq('type', input.type);
  }
  if (input.lead_status && typeof input.lead_status === 'string') {
    query = query.eq('lead_status', input.lead_status);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { contacts: data ?? [], count: data?.length ?? 0 };
}
