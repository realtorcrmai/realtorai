import type Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../lib/supabase.js';
import { retrieveContext } from '../shared/rag/retriever.js';
import { logger } from '../lib/logger.js';

/**
 * Claude tool definitions for the orchestrator.
 *
 * M1 ships 4 read tools and 1 write tool (`emit_email`). Adding more tools
 * is the primary way to expand capability — keep tools small and composable.
 */

export const orchestratorTools: Anthropic.Tool[] = [
  {
    name: 'get_contact',
    description: 'Load a single contact by id including name, email, type, and stored intelligence.',
    input_schema: {
      type: 'object',
      properties: { contact_id: { type: 'string', description: 'UUID of the contact' } },
      required: ['contact_id'],
    },
  },
  {
    name: 'get_listing',
    description: 'Load a single listing by id including address, price, beds, baths, and status.',
    input_schema: {
      type: 'object',
      properties: { listing_id: { type: 'string', description: 'UUID of the listing' } },
      required: ['listing_id'],
    },
  },
  {
    name: 'get_realtor',
    description: 'Load the realtor (agent) for branding and signature.',
    input_schema: {
      type: 'object',
      properties: { realtor_id: { type: 'string', description: 'UUID of the realtor' } },
      required: ['realtor_id'],
    },
  },
  {
    name: 'rag_retrieve',
    description:
      'Semantic search across the contact\'s full interaction history — communications, emails, activities, recommendations. Returns formatted context chunks ranked by relevance (hybrid HyDE + vector + full-text search). Use this to understand a contact\'s interests, past conversations, and engagement patterns before writing an email.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query, e.g. "what properties has this contact shown interest in"',
        },
        contact_id: { type: 'string', description: 'UUID of the contact to scope results to' },
      },
      required: ['query', 'contact_id'],
    },
  },
  {
    name: 'emit_email',
    description:
      'Final tool — call this exactly once with the email content. After calling this the orchestrator stops.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ready', 'insufficient_data'] },
        reason: { type: 'string', description: 'Required if status is insufficient_data' },
        subject: { type: 'string', description: 'Email subject line, <60 chars' },
        preheader: { type: 'string', description: 'Preview text shown next to subject in inbox' },
        greeting: { type: 'string', description: 'e.g., "Hi Alex,"' },
        body_paragraphs: {
          type: 'array',
          items: { type: 'string' },
          description: '1-3 short paragraphs, total <120 words',
        },
        cta_label: { type: 'string', description: 'Button text' },
        cta_url: { type: 'string', description: 'Button destination URL' },
        signoff: { type: 'string', description: 'e.g., "Talk soon, — Sarah"' },
      },
      required: ['status'],
    },
  },
];

/* ───────────────────────── Tool implementations ───────────────────────── */

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_contact':
      return await toolGetContact(String(input.contact_id));
    case 'get_listing':
      return await toolGetListing(String(input.listing_id));
    case 'get_realtor':
      return await toolGetRealtor(String(input.realtor_id));
    case 'rag_retrieve':
      return await toolRagRetrieve(String(input.query ?? ''), String(input.contact_id));
    case 'emit_email':
      // emit_email is captured by the orchestrator loop, not executed here
      return { ok: true };
    default:
      logger.warn({ name }, 'tools: unknown tool call');
      return { error: `unknown tool: ${name}` };
  }
}

async function toolGetContact(contactId: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, email, phone, type, pref_channel, newsletter_intelligence')
    .eq('id', contactId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'contact not found' };
  return data;
}

async function toolGetListing(listingId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('id, address, list_price, status, current_phase, mls_status')
    .eq('id', listingId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'listing not found' };
  return data;
}

async function toolGetRealtor(realtorId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone')
    .eq('id', realtorId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'realtor not found' };
  return data;
}

/**
 * M4 hybrid RAG retrieval — replaces the M1 direct-DB-query stub.
 *
 * Uses HyDE (Claude Haiku hypothetical answer) + Voyage semantic search +
 * Postgres full-text search, fused via 3-way Reciprocal Rank Fusion. Returns
 * formatted context chunks the orchestrator can inject into the email-writing
 * prompt. Falls back gracefully to empty context if RAG is unavailable.
 */
async function toolRagRetrieve(query: string, contactId: string) {
  try {
    const result = await retrieveContext(supabase, query, {
      contact_id: contactId,
      content_type: ['message', 'activity', 'email', 'recommendation'],
    }, 8);
    return {
      context: result.formatted || '(no relevant context found)',
      source_count: result.sources.length,
      sources: result.sources.slice(0, 5),
    };
  } catch (err) {
    logger.warn({ err, contactId }, 'tools: rag_retrieve failed, returning empty context');
    return { context: '(RAG unavailable)', source_count: 0, sources: [] };
  }
}
