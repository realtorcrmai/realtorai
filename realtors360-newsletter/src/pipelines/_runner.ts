import { render } from '@react-email/render';
import React from 'react';
import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import { generateEmail } from '../orchestrator/index.js';
import { resolveRuleForEvent } from '../orchestrator/rules.js';
import { sendEmail } from '../lib/resend.js';
import { getEmailComponent } from '../emails/index.js';

/**
 * Generic pipeline runner.
 *
 * Every event-driven email type follows the same shape:
 *   1. Rule resolution (priority + cap + min hours)
 *   2. Resolve recipient contact + realtor
 *   3. Load any extra context the prompt builder asks for
 *   4. Build the user prompt for the orchestrator
 *   5. Run the orchestrator
 *   6. Render the registered email component
 *   7. Insert into newsletters (review mode) OR send via Resend (auto mode)
 *
 * Each pipeline file imports `runPipeline` and provides:
 *   - eventType: matches `email_events.event_type`
 *   - resolveRecipientContactId: looks at the event row and returns who to email
 *   - buildPrompt: turns the event row into the user prompt for Claude
 *
 * That's it. ~30 lines per pipeline file instead of 150.
 */

export type EventRow = {
  id: string;
  realtor_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  affected_contact_ids: string[] | null;
  contact_id: string | null;
  listing_id: string | null;
  status: string;
};

export type RecipientResolver = (event: EventRow) => string | null;

export type PromptBuilder = (input: {
  event: EventRow;
  contact: { id: string; name: string | null; email: string | null };
  realtor: { id: string; name: string | null; email: string | null };
}) => Promise<string>;

export type PipelineConfig = {
  /** Event type (matches `email_events.event_type` and the registered rule's event_type) */
  eventType: string;
  /** Resolves the contact_id of the email recipient from the event row */
  resolveRecipientContactId: RecipientResolver;
  /** Builds the user prompt that the orchestrator hands to Claude */
  buildPrompt: PromptBuilder;
};

export type PipelineResult =
  | { ok: true; newsletter_id: string; resend_id: string }
  | { ok: false; reason: string };

export async function runPipeline(
  event: EventRow,
  config: PipelineConfig
): Promise<PipelineResult> {
  // 1. Resolve recipient
  const recipientContactId = config.resolveRecipientContactId(event);
  if (!recipientContactId) {
    return { ok: false, reason: 'no recipient resolvable from event' };
  }

  // 2. Rule resolution (priority + cap + min hours)
  const ruling = await resolveRuleForEvent({
    realtor_id: event.realtor_id,
    event_type: event.event_type,
    contact_id: recipientContactId,
  });
  if (!ruling.ok) {
    logger.info(
      { reason: ruling.reason, eventType: event.event_type, contactId: recipientContactId },
      'pipeline: rule blocked send'
    );
    return { ok: false, reason: `rule:${ruling.reason}` };
  }
  const rule = ruling.rule;

  // 3. Load contact + realtor
  const [contactRes, realtorRes] = await Promise.all([
    supabase.from('contacts').select('id, name, email').eq('id', recipientContactId).maybeSingle(),
    supabase.from('users').select('id, name, email').eq('id', event.realtor_id).maybeSingle(),
  ]);

  if (!contactRes.data || !realtorRes.data) {
    return { ok: false, reason: 'missing contact or realtor row' };
  }
  if (!contactRes.data.email) return { ok: false, reason: 'contact has no email' };

  // 4. Build prompt
  const userPrompt = await config.buildPrompt({
    event,
    contact: contactRes.data,
    realtor: realtorRes.data,
  });

  // 5. Orchestrator
  const result = await generateEmail({ userPrompt });
  if (!result.ok) {
    logger.warn({ reason: result.reason, eventType: event.event_type }, 'pipeline: orchestrator failed');
    return { ok: false, reason: `orchestrator:${result.reason}` };
  }

  const draft = result.draft;
  if (draft.status !== 'ready' || !draft.subject || !draft.body_paragraphs) {
    return { ok: false, reason: `draft not ready: ${draft.reason ?? 'unknown'}` };
  }

  // 6. Render — look up component from registry
  const Component = getEmailComponent(rule.email_type);
  if (!Component) {
    return { ok: false, reason: `no template registered for email_type=${rule.email_type}` };
  }

  const firstName = (contactRes.data.name ?? '').split(' ')[0] || 'there';
  const realtorName = realtorRes.data.name ?? 'Your agent';

  const html = await render(
    React.createElement(Component, {
      preheader: draft.preheader ?? draft.subject,
      greeting: draft.greeting ?? `Hi ${firstName},`,
      bodyParagraphs: draft.body_paragraphs,
      ctaLabel: draft.cta_label ?? 'Learn more',
      ctaUrl: draft.cta_url ?? 'https://realtors360.com',
      signoff: draft.signoff ?? `— ${realtorName}`,
      realtorName,
    })
  );

  // 7. Send mode handling
  if (rule.send_mode === 'review') {
    const { data: nl, error } = await supabase
      .from('newsletters')
      .insert({
        realtor_id: event.realtor_id,
        contact_id: recipientContactId,
        subject: draft.subject,
        html_body: html,
        status: 'pending_review',
        email_type: rule.email_type,
        source_event_id: event.id,
      })
      .select('id')
      .single();
    if (error) return { ok: false, reason: `db:${error.message}` };
    return { ok: true, newsletter_id: nl.id, resend_id: 'pending_review' };
  }

  // auto mode
  const sendResult = await sendEmail({
    to: contactRes.data.email,
    subject: draft.subject,
    html,
    tags: [
      { name: 'email_type', value: rule.email_type },
      { name: 'event_id', value: event.id },
    ],
  });

  const { data: nl, error } = await supabase
    .from('newsletters')
    .insert({
      realtor_id: event.realtor_id,
      contact_id: recipientContactId,
      subject: draft.subject,
      html_body: html,
      status: 'sent',
      sent_at: new Date().toISOString(),
      resend_id: sendResult.id,
      email_type: rule.email_type,
      source_event_id: event.id,
    })
    .select('id')
    .single();

  if (error) {
    logger.error(
      { err: error, eventType: event.event_type },
      'pipeline: insert newsletter failed (email already sent)'
    );
    return { ok: false, reason: `db_after_send:${error.message}` };
  }

  return { ok: true, newsletter_id: nl.id, resend_id: sendResult.id };
}
