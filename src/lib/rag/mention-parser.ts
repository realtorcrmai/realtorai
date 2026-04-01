// ============================================================
// Mention Parser — @-mention detection and resolution (A19)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface Mention {
  type: 'contact' | 'listing';
  id: string;
  name: string;
}

export interface ParsedMentions {
  cleanText: string;
  mentions: Mention[];
}

/**
 * Parse @-mentions from text and resolve them against the database.
 * Handles formats like @Sarah Chen, @123 Main St
 */
export function parseMentionsFromText(
  text: string,
  knownMentions: Mention[]
): ParsedMentions {
  let cleanText = text;
  const mentions: Mention[] = [];

  // Replace known mentions (already resolved from the UI)
  for (const mention of knownMentions) {
    const pattern = new RegExp(`@${escapeRegex(mention.name)}`, 'gi');
    if (pattern.test(cleanText)) {
      mentions.push(mention);
      cleanText = cleanText.replace(pattern, mention.name);
    }
  }

  return { cleanText, mentions };
}

/**
 * Search contacts and listings matching a query string.
 * Used by the @-mention dropdown in ChatInput.
 */
export async function searchMentionCandidates(
  db: SupabaseClient,
  query: string,
  limit = 8
): Promise<Mention[]> {
  if (!query || query.length < 2) return [];
  const results: Mention[] = [];

  // Search contacts by name
  const { data: contacts } = await db
    .from('contacts')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (contacts) {
    for (const c of contacts) {
      results.push({ type: 'contact', id: c.id, name: c.name });
    }
  }

  // Search listings by address
  const { data: listings } = await db
    .from('listings')
    .select('id, address')
    .ilike('address', `%${query}%`)
    .limit(limit);

  if (listings) {
    for (const l of listings) {
      results.push({ type: 'listing', id: l.id, name: l.address });
    }
  }

  return results.slice(0, limit);
}

/**
 * Format mentions as additional context for the RAG system.
 */
export function formatMentionContext(mentions: Mention[]): string {
  if (mentions.length === 0) return '';

  const lines = mentions.map((m) => {
    if (m.type === 'contact') return `Referenced contact: ${m.name} (ID: ${m.id})`;
    return `Referenced listing: ${m.name} (ID: ${m.id})`;
  });

  return 'MENTIONED ENTITIES:\n' + lines.join('\n');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
