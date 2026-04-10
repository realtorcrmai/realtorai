import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const GET_LISTINGS_SCHEMA: Anthropic.Tool = {
  name: 'get_listings',
  description:
    'Get active listings for this realtor. Returns address, price, status, property type, and MLS number. Use to find properties relevant to a contact.',
  input_schema: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status: active, conditional, pending, sold. Omit for all.' },
      limit: { type: 'number', description: 'Max listings to return (default 10, max 30)' },
    },
  },
};

export async function getListings(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const limit = Math.min(Number(input.limit) || 10, 30);

  let query = ctx.db
    .from('listings')
    .select('id, address, list_price, status, property_type, mls_number, updated_at')
    .eq('realtor_id', ctx.realtorId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (input.status && typeof input.status === 'string') {
    query = query.eq('status', input.status);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { listings: data ?? [], count: data?.length ?? 0 };
}
