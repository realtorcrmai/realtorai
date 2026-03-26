// ============================================================
// Text Chunker — per-source splitting + composite document builders
// ============================================================

import { CHUNK_CONFIG, estimateTokens } from './constants';
import type { TextChunk, SourceTable, ContentType } from './types';

// ---------- HTML stripping ----------

/** Strip HTML tags and decode entities to plain text */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Generic text splitter ----------

/**
 * Split text into chunks of approximately maxTokens.
 * Splits on paragraph boundaries first, then sentences, then hard truncation.
 * Returns chunks with optional overlap.
 */
export function splitText(
  text: string,
  maxTokens: number,
  overlap: number = 0
): string[] {
  const totalTokens = estimateTokens(text);
  if (totalTokens <= maxTokens) return [text];

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const combined = current ? `${current}\n\n${para}` : para;
    if (estimateTokens(combined) <= maxTokens) {
      current = combined;
    } else {
      if (current) chunks.push(current.trim());
      // If single paragraph exceeds max, split by sentences
      if (estimateTokens(para) > maxTokens) {
        const sentences = para.split(/(?<=[.!?])\s+/);
        current = '';
        for (const sentence of sentences) {
          const sentCombined = current ? `${current} ${sentence}` : sentence;
          if (estimateTokens(sentCombined) <= maxTokens) {
            current = sentCombined;
          } else {
            if (current) chunks.push(current.trim());
            // Hard truncate if single sentence exceeds max
            if (estimateTokens(sentence) > maxTokens) {
              const maxChars = maxTokens * 4;
              chunks.push(sentence.slice(0, maxChars).trim());
              current = '';
            } else {
              current = sentence;
            }
          }
        }
      } else {
        current = para;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Apply overlap (prepend last N tokens of previous chunk)
  if (overlap > 0 && chunks.length > 1) {
    const overlapChars = overlap * 4;
    const withOverlap = [chunks[0]];
    for (let i = 1; i < chunks.length; i++) {
      const prevTail = chunks[i - 1].slice(-overlapChars);
      withOverlap.push(`${prevTail} ${chunks[i]}`);
    }
    return withOverlap;
  }

  return chunks;
}

// ---------- Composite document builders ----------

interface ContactRow {
  id: string;
  name: string;
  type: string;
  stage_bar?: string;
  notes?: string;
  tags?: string[];
  buyer_preferences?: Record<string, unknown>;
  seller_preferences?: Record<string, unknown>;
  demographics?: Record<string, unknown>;
  newsletter_intelligence?: Record<string, unknown>;
  created_at: string;
}

export function buildContactDoc(contact: ContactRow): string {
  const parts: string[] = [
    `${contact.name} (${contact.type}${contact.stage_bar ? `, ${contact.stage_bar}` : ''})`,
  ];
  if (contact.notes) parts.push(`Notes: ${contact.notes}`);
  if (contact.tags?.length) parts.push(`Tags: ${contact.tags.join(', ')}`);
  if (contact.buyer_preferences) {
    const bp = contact.buyer_preferences as Record<string, unknown>;
    const budget = [bp.price_range_min, bp.price_range_max]
      .filter(Boolean)
      .join('-');
    if (budget) parts.push(`Budget: $${budget}`);
    if (Array.isArray(bp.areas) && bp.areas.length)
      parts.push(`Areas: ${bp.areas.join(', ')}`);
    if (Array.isArray(bp.property_types) && bp.property_types.length)
      parts.push(`Property types: ${bp.property_types.join(', ')}`);
    if (bp.bedrooms) parts.push(`Bedrooms: ${bp.bedrooms}+`);
  }
  if (contact.seller_preferences) {
    const sp = contact.seller_preferences as Record<string, unknown>;
    if (sp.timeline) parts.push(`Sell timeline: ${sp.timeline}`);
    if (sp.price_expectation)
      parts.push(`Price expectation: $${sp.price_expectation}`);
  }
  if (contact.demographics) {
    const d = contact.demographics as Record<string, unknown>;
    if (d.family_status) parts.push(`Family: ${d.family_status}`);
    if (Array.isArray(d.interests) && d.interests.length)
      parts.push(`Interests: ${d.interests.join(', ')}`);
  }
  return parts.join('\n');
}

interface ListingRow {
  id: string;
  address: string;
  list_price?: number;
  status: string;
  property_type?: string;
  notes?: string;
  mls_number?: string;
  created_at: string;
}

export function buildListingDoc(listing: ListingRow): string {
  const parts: string[] = [
    `${listing.address} — $${listing.list_price ?? 'TBD'} (${listing.status})`,
  ];
  if (listing.property_type) parts.push(`Type: ${listing.property_type}`);
  if (listing.mls_number) parts.push(`MLS#: ${listing.mls_number}`);
  if (listing.notes) parts.push(`Notes: ${listing.notes}`);
  return parts.join('\n');
}

export function buildNewsletterDoc(newsletter: {
  subject: string;
  html_body: string;
}): string {
  const plainText = stripHtml(newsletter.html_body);
  return `Subject: ${newsletter.subject}\n\n${plainText}`;
}

export function buildActivityDoc(activity: {
  subject?: string;
  description?: string;
  activity_type: string;
  outcome?: string;
}): string {
  const parts: string[] = [];
  if (activity.subject) parts.push(activity.subject);
  if (activity.description) parts.push(activity.description);
  parts.push(`[${activity.activity_type}${activity.outcome ? `, ${activity.outcome}` : ''}]`);
  return parts.join('\n');
}

export function buildOfferDoc(offer: {
  offer_amount: number;
  status: string;
  notes?: string;
  financing_type?: string;
}): string {
  const parts = [`Offer: $${offer.offer_amount} (${offer.status})`];
  if (offer.financing_type) parts.push(`Financing: ${offer.financing_type}`);
  if (offer.notes) parts.push(`Notes: ${offer.notes}`);
  return parts.join('\n');
}

// ---------- Main chunking function ----------

/**
 * Chunk a record from any source table into TextChunk[].
 * Handles composite document building + splitting.
 */
export function chunkRecord(
  sourceTable: SourceTable,
  record: Record<string, unknown>
): TextChunk[] {
  const config = CHUNK_CONFIG[sourceTable] ?? { maxTokens: 512, overlap: 0 };
  let text: string;
  let contentType: ContentType;
  const metadata: TextChunk['metadata'] = {};

  switch (sourceTable) {
    case 'communications':
      text = (record.body as string) ?? '';
      contentType = 'message';
      metadata.contact_id = record.contact_id as string;
      metadata.channel = record.channel as string;
      metadata.direction = record.direction as string;
      metadata.source_created_at = record.created_at as string;
      break;

    case 'activities':
      text = buildActivityDoc(record as Parameters<typeof buildActivityDoc>[0]);
      contentType = 'activity';
      metadata.contact_id = record.contact_id as string;
      metadata.listing_id = record.listing_id as string | undefined;
      metadata.direction = record.direction as string | undefined;
      metadata.source_created_at = record.created_at as string;
      break;

    case 'newsletters':
      text = buildNewsletterDoc(record as Parameters<typeof buildNewsletterDoc>[0]);
      contentType = 'email';
      metadata.contact_id = record.contact_id as string;
      metadata.audience_type = record.email_type as string | undefined;
      metadata.source_created_at = record.sent_at as string ?? record.created_at as string;
      break;

    case 'contacts':
      text = buildContactDoc(record as unknown as ContactRow);
      contentType = 'profile';
      metadata.audience_type = record.type as string;
      metadata.source_created_at = record.updated_at as string ?? record.created_at as string;
      break;

    case 'listings':
      text = buildListingDoc(record as unknown as ListingRow);
      contentType = 'listing';
      metadata.source_created_at = record.updated_at as string ?? record.created_at as string;
      break;

    case 'agent_recommendations':
      text = (record.reasoning as string) ?? '';
      contentType = 'recommendation';
      metadata.contact_id = record.contact_id as string;
      metadata.source_created_at = record.created_at as string;
      break;

    case 'message_templates': {
      const subject = record.subject as string | undefined;
      const body = record.body as string ?? '';
      text = subject ? `${subject}\n\n${body}` : body;
      contentType = 'template';
      metadata.channel = record.channel as string | undefined;
      metadata.source_created_at = record.created_at as string;
      break;
    }

    case 'offers':
      text = buildOfferDoc(record as Parameters<typeof buildOfferDoc>[0]);
      contentType = 'offer';
      metadata.contact_id = record.buyer_contact_id as string;
      metadata.listing_id = record.listing_id as string;
      metadata.source_created_at = record.created_at as string;
      break;

    case 'offer_conditions': {
      const desc = (record.description as string) ?? '';
      const notes = (record.notes as string) ?? '';
      text = [desc, notes].filter(Boolean).join('\n');
      contentType = 'offer';
      metadata.source_created_at = record.created_at as string;
      break;
    }

    case 'knowledge_articles': {
      const title = record.title as string ?? '';
      const body = record.body as string ?? '';
      text = `${title}\n\n${body}`;
      const category = record.category as string;
      contentType = (
        ['faq', 'playbook', 'script', 'process', 'explainer'].includes(category)
          ? category
          : 'faq'
      ) as ContentType;
      metadata.audience_type = record.audience_type as string | undefined;
      metadata.topic = (record.tags as string[])?.join(', ');
      metadata.source_created_at = record.created_at as string;
      break;
    }

    case 'competitive_emails': {
      const subject = record.subject as string ?? '';
      const bodyText = record.body_text as string ?? '';
      text = `${subject}\n\n${bodyText}`;
      contentType = 'competitor';
      metadata.channel = 'email';
      metadata.source_created_at = record.received_at as string ?? record.created_at as string;
      break;
    }

    default:
      throw new Error(`Unknown source table: ${sourceTable}`);
  }

  if (!text.trim()) return [];

  // Split into chunks
  const textChunks = splitText(text, config.maxTokens, config.overlap);

  return textChunks.map((chunk, index) => ({
    text: chunk,
    index,
    metadata: {
      ...metadata,
      // Override content type for knowledge articles
    },
  }));
}
