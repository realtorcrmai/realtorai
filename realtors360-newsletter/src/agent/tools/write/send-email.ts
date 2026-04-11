import type Anthropic from '@anthropic-ai/sdk';
import type { ToolContext } from '../index.js';
import { sendEmail as resendSend } from '../../../lib/resend.js';
import { canSendToContact } from '../../../lib/compliance.js';
import { logger } from '../../../lib/logger.js';

export const SEND_EMAIL_SCHEMA: Anthropic.Tool = {
  name: 'send_email',
  description:
    'Send an email draft immediately via Resend. Only use for approved drafts or auto-send (L1+ trust). Enforces CASL compliance and frequency caps before sending. Idempotent: won\'t re-send a draft that\'s already been sent.',
  input_schema: {
    type: 'object',
    properties: {
      draft_id: { type: 'string', description: 'UUID of the draft to send' },
    },
    required: ['draft_id'],
  },
};

export async function sendEmailTool(
  ctx: ToolContext,
  input: Record<string, unknown>
): Promise<unknown> {
  const draftId = String(input.draft_id);

  // Load draft
  const { data: draft, error: draftErr } = await ctx.db
    .from('agent_drafts')
    .select('*')
    .eq('id', draftId)
    .eq('realtor_id', ctx.realtorId)
    .maybeSingle();

  if (draftErr || !draft) return { error: draftErr?.message || 'Draft not found' };
  if (draft.status === 'sent') return { draft_id: draftId, status: 'already_sent', resend_id: draft.resend_message_id };
  if (draft.status === 'rejected') return { error: 'Draft was rejected by realtor' };

  // Load contact for compliance check
  const { data: contact } = await ctx.db
    .from('contacts')
    .select('id, email, newsletter_unsubscribed, casl_consent_given')
    .eq('id', draft.contact_id)
    .eq('realtor_id', ctx.realtorId)
    .maybeSingle();

  if (!contact) return { error: 'Contact not found' };

  const sendCheck = canSendToContact(contact);
  if (!sendCheck.allowed) {
    await ctx.db.from('agent_drafts').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', draftId);
    return { error: `Compliance: ${sendCheck.reason}`, status: 'rejected' };
  }

  // Send via Resend
  try {
    const result = await resendSend({
      to: contact.email!,
      subject: draft.subject,
      html: draft.body_html,
      text: draft.body_text || undefined,
      tags: [
        { name: 'contact_id', value: draft.contact_id },
        { name: 'email_type', value: draft.email_type },
        { name: 'draft_id', value: draftId },
      ],
    });

    // Update draft status
    await ctx.db.from('agent_drafts').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      resend_message_id: result.id,
      updated_at: new Date().toISOString(),
    }).eq('id', draftId);

    // Track in newsletters table
    await ctx.db.from('newsletters').insert({
      contact_id: draft.contact_id,
      realtor_id: ctx.realtorId,
      subject: draft.subject,
      email_type: draft.email_type,
      status: 'sent',
      html_body: draft.body_html,
      sent_at: new Date().toISOString(),
      resend_message_id: result.id,
      send_mode: 'agent_auto',
      ai_context: { source: 'newsletter_agent', draft_id: draftId },
    });

    logger.info({ draftId, contactId: draft.contact_id, resendId: result.id }, 'agent: email sent');
    return { draft_id: draftId, status: 'sent', resend_id: result.id };
  } catch (err) {
    logger.error({ err, draftId }, 'agent: send failed');
    return { error: `Send failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
