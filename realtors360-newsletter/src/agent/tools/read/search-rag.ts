import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';
import { retrieveContext } from '../../../shared/rag/retriever.js';
import { logger } from '../../../lib/logger.js';

export const SEARCH_RAG_SCHEMA: Anthropic.Tool = {
  name: 'search_rag',
  description:
    'Semantic search across all stored data for a contact — communications, emails, activities, recommendations. Uses HyDE + vector + full-text search. Returns formatted context chunks ranked by relevance. Use to understand a contact\'s history and preferences before writing an email.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural language search query' },
      contact_id: { type: 'string', description: 'UUID of the contact to scope results to (optional)' },
      top_k: { type: 'number', description: 'Max results to return (default 8)' },
    },
    required: ['query'],
  },
};

export async function searchRag(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const query = String(input.query);
  const contactId = input.contact_id ? String(input.contact_id) : undefined;
  const topK = Math.min(Number(input.top_k) || 8, 20);

  try {
    const result = await retrieveContext(ctx.db, query, {
      contact_id: contactId,
      content_type: ['message', 'activity', 'email', 'recommendation', 'listing'],
    }, topK);

    return {
      context: result.formatted || '(no relevant results found)',
      source_count: result.sources.length,
      sources: result.sources.slice(0, 5),
    };
  } catch (err) {
    logger.warn({ err }, 'agent tool: search_rag failed');
    return { context: '(search unavailable)', source_count: 0, sources: [] };
  }
}
