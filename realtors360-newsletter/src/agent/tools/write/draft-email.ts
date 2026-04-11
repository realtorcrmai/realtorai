import type Anthropic from '@anthropic-ai/sdk';
import crypto from 'node:crypto';
import type { ToolContext } from '../index.js';
import { logger } from '../../../lib/logger.js';

export const DRAFT_EMAIL_SCHEMA: Anthropic.Tool = {
  name: 'draft_email',
  description:
    'Create an email draft for a contact. The draft is stored in agent_drafts and can be sent immediately (if trust level allows) or queued for realtor approval. Idempotent: duplicate content for the same contact is detected and rejected.',
  input_schema: {
    type: 'object',
    properties: {
      contact_id: { type: 'string' },
      email_type: { type: 'string' },
      subject: { type: 'string' },
      body_html: { type: 'string', description: 'HTML email body' },
      body_text: { type: 'string', description: 'Plain text fallback' },
    },
    required: ['contact_id', 'email_type', 'subject', 'body_html'],
  },
};

export async function draftEmail(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const contactId = String(input.contact_id);
  const emailType = String(input.email_type);
  const subject = String(input.subject);
  const bodyHtml = String(input.body_html);
  const bodyText = input.body_text ? String(input.body_text) : undefined;

  const contentHash = crypto.createHash('sha256').update(`${contactId}:${emailType}:${subject}:${bodyHtml}`).digest('hex').slice(0, 16);
  const idempotencyKey = `${contactId}:${emailType}:${contentHash}`;

  // Check for duplicate
  const { data: existing } = await ctx.db
    .from('agent_drafts')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) {
    return { draft_id: existing.id, status: existing.status, duplicate: true };
  }

  const { data: draft, error } = await ctx.db
    .from('agent_drafts')
    .insert({
      realtor_id: ctx.realtorId,
      contact_id: contactId,
      email_type: emailType,
      subject,
      body_html: bodyHtml,
      body_text: bodyText,
      content_hash: contentHash,
      idempotency_key: idempotencyKey,
      status: 'pending_review',
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  logger.info({ draftId: draft.id, contactId, emailType }, 'draft_email: created');
  return { draft_id: draft.id, status: 'pending_review', duplicate: false };
}
