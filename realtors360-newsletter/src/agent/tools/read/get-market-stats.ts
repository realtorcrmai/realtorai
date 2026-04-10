import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';

export const GET_MARKET_STATS_SCHEMA: Anthropic.Tool = {
  name: 'get_market_stats',
  description:
    'Get cached market statistics for an area (city or neighbourhood). Returns average prices, days on market, inventory levels, and trends. Data comes from the market_stats_cache table populated by external scrapers.',
  input_schema: {
    type: 'object',
    properties: {
      area: { type: 'string', description: 'Area name, e.g. "Vancouver", "Surrey", "Langley"' },
      stat_type: { type: 'string', description: 'Type of stats: "residential", "condo", "townhouse", or omit for all' },
    },
    required: ['area'],
  },
};

export async function getMarketStats(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  let query = ctx.db
    .from('market_stats_cache')
    .select('area, stat_type, period, data, source, fetched_at')
    .ilike('area', `%${String(input.area)}%`)
    .order('fetched_at', { ascending: false })
    .limit(5);

  if (input.stat_type && typeof input.stat_type === 'string') {
    query = query.eq('stat_type', input.stat_type);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { message: `No cached market stats found for "${input.area}". Market data scrapers may not have run yet.` };
  return { stats: data };
}
