import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const GET_RECENT_EVENTS_SCHEMA: Anthropic.Tool = {
  name: 'get_recent_events',
  description:
    'Get recent email events (sends, opens, clicks, bounces) for the realtor\'s contacts. Use to understand recent engagement and identify contacts who need follow-up.',
  input_schema: {
    type: 'object',
    properties: {
      since: { type: 'string', description: 'ISO date string — only return events after this date (default: 7 days ago)' },
      event_types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by event types: listing_matched_search, listing_price_dropped, listing_sold, showing_confirmed, contact_birthday',
      },
      limit: { type: 'number', description: 'Max events to return (default 20, max 50)' },
    },
  },
};

export async function getRecentEvents(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const limit = Math.min(Number(input.limit) || 20, 50);
  const since = input.since
    ? String(input.since)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let query = ctx.db
    .from('email_events')
    .select('id, event_type, status, contact_id, listing_id, event_data, created_at')
    .eq('realtor_id', ctx.realtorId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (Array.isArray(input.event_types) && input.event_types.length > 0) {
    query = query.in('event_type', input.event_types as string[]);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { events: data ?? [], count: data?.length ?? 0 };
}
