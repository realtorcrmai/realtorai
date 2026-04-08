import { supabase } from './supabase.js';
import { logger } from './logger.js';

/**
 * RAG retrieval — M1 minimal implementation.
 *
 * For the saved-search-match pipeline we only need three pieces of context per
 * contact:
 *   1. Last 5 communications (any channel)
 *   2. Click history from newsletter_events
 *   3. Inferred interests from contacts.newsletter_intelligence (JSONB)
 *
 * M2 will replace this with the full Voyage + pgvector retriever already built
 * at `realestate-crm/src/lib/rag/retriever.ts`. For now, direct DB queries
 * are fast enough and zero-cost.
 */

export type RagContext = {
  recentComms: Array<{ direction: string; channel: string; body: string; created_at: string }>;
  clickHistory: Array<{ event_type: string; link_url: string | null; created_at: string }>;
  intelligence: Record<string, unknown> | null;
};

export async function retrieveContactContext(contactId: string): Promise<RagContext> {
  const [commsRes, clicksRes, contactRes] = await Promise.all([
    supabase
      .from('communications')
      .select('direction, channel, body, created_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('newsletter_events')
      .select('event_type, link_url, created_at')
      .eq('contact_id', contactId)
      .in('event_type', ['click', 'open'])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('contacts').select('newsletter_intelligence').eq('id', contactId).maybeSingle(),
  ]);

  if (commsRes.error) logger.warn({ err: commsRes.error }, 'rag: comms query failed');
  if (clicksRes.error) logger.warn({ err: clicksRes.error }, 'rag: clicks query failed');
  if (contactRes.error) logger.warn({ err: contactRes.error }, 'rag: contact query failed');

  return {
    recentComms: commsRes.data ?? [],
    clickHistory: clicksRes.data ?? [],
    intelligence: (contactRes.data?.newsletter_intelligence as Record<string, unknown>) ?? null,
  };
}
