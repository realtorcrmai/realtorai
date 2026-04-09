import {
  CHUNK_CONFIG,
  SOURCE_TO_CONTENT_TYPE,
  estimateTokens,
  type ContentType,
  type SourceTable,
  type TextChunk,
} from './types.js';

/**
 * RAG chunker.
 *
 * Ported faithfully from `realestate-crm/src/lib/rag/chunker.ts` (M3-A batch 1).
 * Behaviour preserved exactly: same paragraph-then-sentence-then-truncate
 * splitting, same per-source composite document builders, same content-type
 * mapping. Tightened to remove the `as any` casts; replaced with `as unknown`
 * + structural typing where the CRM original used `as`.
 */

// ────────────────────────────── HTML stripping ──────────────────────────────

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

// ────────────────────────────── Text splitter ──────────────────────────────

/**
 * Split text into ~maxTokens chunks. Splits on paragraph boundaries first,
 * then sentences, then hard truncates. Optional overlap prepends the last N
 * tokens of the previous chunk.
 */
export function splitText(text: string, maxTokens: number, overlap = 0): string[] {
  const totalTokens = estimateTokens(text);
  if (totalTokens <= maxTokens) return [text];

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const combined = current ? `${current}\n\n${para}` : para;
    if (estimateTokens(combined) <= maxTokens) {
      current = combined;
      continue;
    }

    if (current) chunks.push(current.trim());

    if (estimateTokens(para) > maxTokens) {
      // Split paragraph by sentences
      const sentences = para.split(/(?<=[.!?])\s+/);
      current = '';
      for (const sentence of sentences) {
        const sentCombined = current ? `${current} ${sentence}` : sentence;
        if (estimateTokens(sentCombined) <= maxTokens) {
          current = sentCombined;
        } else {
          if (current) chunks.push(current.trim());
          if (estimateTokens(sentence) > maxTokens) {
            // Hard truncate
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
  if (current.trim()) chunks.push(current.trim());

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

// ──────────────────────── Composite document builders ────────────────────────

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
    const bp = contact.buyer_preferences;
    const budget = [bp.price_range_min, bp.price_range_max].filter(Boolean).join('-');
    if (budget) parts.push(`Budget: $${budget}`);
    if (Array.isArray(bp.areas) && bp.areas.length) parts.push(`Areas: ${bp.areas.join(', ')}`);
    if (Array.isArray(bp.property_types) && bp.property_types.length)
      parts.push(`Property types: ${bp.property_types.join(', ')}`);
    if (bp.bedrooms) parts.push(`Bedrooms: ${String(bp.bedrooms)}+`);
  }
  if (contact.seller_preferences) {
    const sp = contact.seller_preferences;
    if (sp.timeline) parts.push(`Sell timeline: ${String(sp.timeline)}`);
    if (sp.price_expectation) parts.push(`Price expectation: $${String(sp.price_expectation)}`);
  }
  if (contact.demographics) {
    const d = contact.demographics;
    if (d.family_status) parts.push(`Family: ${String(d.family_status)}`);
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

export function buildNewsletterDoc(newsletter: { subject: string; html_body: string }): string {
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

// ────────────────────────────── chunkRecord ──────────────────────────────

const KNOWLEDGE_CATEGORIES: ReadonlyArray<ContentType> = [
  'faq',
  'playbook',
  'script',
  'process',
  'explainer',
];

/** Generic record reader — narrows `unknown` for the cases below. */
function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function asStringOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function chunkRecord(
  sourceTable: SourceTable,
  record: Record<string, unknown>
): TextChunk[] {
  const cfg = CHUNK_CONFIG[sourceTable] ?? { maxTokens: 512, overlap: 0 };
  let text: string;
  let _contentType: ContentType; // captured for parity with CRM original — not yet attached to TextChunk metadata
  const metadata: TextChunk['metadata'] = {};

  switch (sourceTable) {
    case 'communications':
      text = asString(record.body);
      _contentType = 'message';
      metadata.contact_id = asStringOrUndefined(record.contact_id);
      metadata.channel = asStringOrUndefined(record.channel);
      metadata.direction = asStringOrUndefined(record.direction);
      metadata.source_created_at = asStringOrUndefined(record.created_at);
      break;

    case 'activities':
      text = buildActivityDoc(record as Parameters<typeof buildActivityDoc>[0]);
      _contentType = 'activity';
      metadata.contact_id = asStringOrUndefined(record.contact_id);
      metadata.listing_id = asStringOrUndefined(record.listing_id);
      metadata.direction = asStringOrUndefined(record.direction);
      metadata.source_created_at = asStringOrUndefined(record.created_at);
      break;

    case 'newsletters':
      text = buildNewsletterDoc(record as Parameters<typeof buildNewsletterDoc>[0]);
      _contentType = 'email';
      metadata.contact_id = asStringOrUndefined(record.contact_id);
      metadata.audience_type = asStringOrUndefined(record.email_type);
      metadata.source_created_at =
        asStringOrUndefined(record.sent_at) ?? asStringOrUndefined(record.created_at);
      break;

    case 'contacts':
      text = buildContactDoc(record as unknown as ContactRow);
      _contentType = 'profile';
      metadata.audience_type = asStringOrUndefined(record.type);
      metadata.source_created_at =
        asStringOrUndefined(record.updated_at) ?? asStringOrUndefined(record.created_at);
      break;

    case 'listings':
      text = buildListingDoc(record as unknown as ListingRow);
      _contentType = 'listing';
      metadata.source_created_at =
        asStringOrUndefined(record.updated_at) ?? asStringOrUndefined(record.created_at);
      break;

    case 'agent_recommendations':
      text = asString(record.reasoning);
      _contentType = 'recommendation';
      metadata.contact_id = asStringOrUndefined(record.contact_id);
      metadata.source_created_at = asStringOrUndefined(record.created_at);
      break;

    case 'message_templates': {
      const subject = asStringOrUndefined(record.subject);
      const body = asString(record.body);
      text = subject ? `${subject}\n\n${body}` : body;
      _contentType = 'template';
      metadata.channel = asStringOrUndefined(record.channel);
      metadata.source_created_at = asStringOrUndefined(record.created_at);
      break;
    }

    case 'offers':
      text = buildOfferDoc(record as Parameters<typeof buildOfferDoc>[0]);
      _contentType = 'offer';
      metadata.contact_id = asStringOrUndefined(record.buyer_contact_id);
      metadata.listing_id = asStringOrUndefined(record.listing_id);
      metadata.source_created_at = asStringOrUndefined(record.created_at);
      break;

    case 'offer_conditions': {
      const desc = asString(record.description);
      const notes = asString(record.notes);
      text = [desc, notes].filter(Boolean).join('\n');
      _contentType = 'offer';
      metadata.source_created_at = asStringOrUndefined(record.created_at);
      break;
    }

    case 'knowledge_articles': {
      const title = asString(record.title);
      const body = asString(record.body);
      text = `${title}\n\n${body}`;
      const category = asString(record.category);
      _contentType = (KNOWLEDGE_CATEGORIES as ReadonlyArray<string>).includes(category)
        ? (category as ContentType)
        : 'faq';
      metadata.audience_type = asStringOrUndefined(record.audience_type);
      const tags = record.tags;
      if (Array.isArray(tags)) metadata.topic = tags.join(', ');
      metadata.source_created_at = asStringOrUndefined(record.created_at);
      break;
    }

    case 'competitive_emails': {
      const subject = asString(record.subject);
      const bodyText = asString(record.body_text);
      text = `${subject}\n\n${bodyText}`;
      _contentType = 'competitor';
      metadata.channel = 'email';
      metadata.source_created_at =
        asStringOrUndefined(record.received_at) ?? asStringOrUndefined(record.created_at);
      break;
    }

    default: {
      const _exhaustive: never = sourceTable;
      throw new Error(`Unknown source table: ${String(_exhaustive)}`);
    }
  }

  if (!text.trim()) return [];

  const textChunks = splitText(text, cfg.maxTokens, cfg.overlap);
  return textChunks.map((chunk, index) => ({
    text: chunk,
    index,
    metadata: { ...metadata },
  }));
}

/**
 * Resolve the runtime content_type for a given chunked record. Knowledge
 * articles are mapped from `record.category` so the ingestion path knows what
 * value to write to `rag_embeddings.content_type`.
 */
export function resolveContentType(
  sourceTable: SourceTable,
  record: Record<string, unknown>
): ContentType {
  if (sourceTable === 'knowledge_articles') {
    const category = asString(record.category);
    if ((KNOWLEDGE_CATEGORIES as ReadonlyArray<string>).includes(category)) {
      return category as ContentType;
    }
    return 'faq';
  }
  return SOURCE_TO_CONTENT_TYPE[sourceTable];
}
